<script lang="ts">
  import { Command } from "@tauri-apps/plugin-shell";
  import { onMount } from "svelte";
  import Logo from "../components/Logo.svelte";
  import exampleCode from "../exampleCode.ino?raw";
  import * as path from "@tauri-apps/api/path";
  import { create, mkdir, remove } from "@tauri-apps/plugin-fs";
  import { tryAsync, appState } from "../lib/shared.svelte";

  let code = $state(exampleCode);
  let boardList = $state<BoardList>([]);
  let showFullError = $state(false);

  onMount(async () => {
    await tryAsync(async () => {
      boardList = await getBoards();
    });
  });

  async function upload(event: SubmitEvent) {
    event.preventDefault();
    if (appState.loading) {
      return;
    }
    const formData = new FormData(event.target as HTMLFormElement);
    const index = parseInt(formData.get("board-index")?.toString() || "");
    const board = boardList.at(index)!;
    const sketchDir = await path.join(await path.tempDir(), "/TemporarySketch");
    const filename = "TemporarySketch.ino";

    await tryAsync(async () => {
      await makeSketch(sketchDir, filename);
      await compileSketch(board, sketchDir);
      await uploadSketch(board, sketchDir);
    });
  }

  const makeSketch = async (sketchDir: string, filename: string) => {
    try {
      await mkdir(sketchDir, { recursive: true });
      const file = await create(await path.join(sketchDir, filename));
      await file.write(new TextEncoder().encode(code));
      await file.close();
    } catch (err) {
      throw Error("Could not create temporary sketch.", {
        cause: err,
      });
    }
  };

  const compileSketch = async (board: Board, sketchDir: string) => {
    const { stderr, code } = await arduinoCli([
      "compile",
      "-b",
      board.matching_boards[0].fqbn,
      sketchDir,
      "--export-binaries",
    ]);
    if (code !== 0) {
      throw Error("Could not compile your code.", { cause: stderr });
    }
  };

  const uploadSketch = async (board: Board, sketchDir: string) => {
    const { stderr, code } = await arduinoCli([
      "upload",
      sketchDir,
      "-p",
      board.port.address,
    ]);
    if (code !== 0) {
      throw Error("Could not upload to port address.", { cause: stderr });
    }
  };

  const getBoards = async () => {
    const { stdout, stderr, code } = await arduinoCli([
      "board",
      "list",
      "--json",
    ]);
    if (code !== 0) throw boardListError(stderr);
    return getMatchigBoards(stdout);
  };

  const boardListError = (err: unknown) =>
    Error(
      `Could not get the lists of compatible boards. 
        Did you install arduino-cli?\n
        https://arduino.github.io/arduino-cli/0.22/installation/`,
      { cause: err }
    );

  const getMatchigBoards = (stdout: string) => {
    return getDetectedBoards(stdout).filter((port) =>
      port.hasOwnProperty("matching_boards")
    ) as BoardList;
  };

  const getDetectedBoards = (stdout: string) => {
    const output = JSON.parse(stdout);
    if (
      output.hasOwnProperty("detected_ports") &&
      Array.isArray(output.detected_ports)
    ) {
      return output.detected_ports as DetectedPorts;
    }
    throw Error(
      'Could not get property "detected_ports" from arduino-cli board list JSON output.'
    );
  };

  const arduinoCli = async (args: string[]) => {
    try {
      const command = Command.sidecar("binaries/arduino-cli", args);
      return await command.execute();
    } catch (err) {
      throw Error("Command for the arduino-cli binary could not be executed.", {
        cause: err,
      });
    }
  };
</script>

<main class="container">
  <Logo loading={appState.loading} />
  <form onsubmit={upload}>
    <label for="board-index">
      Select your hardware:
      <select id="board-index" name="board-index" required>
        {#each boardList as board, index}
          <option value={index}>
            {board.port.protocol_label} -
            {board.matching_boards.map((b) => b.name).join(" & ")}
          </option>
        {:else}
          <option>No boards connected...</option>
        {/each}
      </select>
    </label>
    <textarea
      id="code"
      name="code"
      placeholder="Enter your Arduino code..."
      aria-label="Write your code here"
      bind:value={code}
    ></textarea>
    <button
      type="submit"
      disabled={boardList.length === 0 || appState.loading}
      class={{ loading: appState.loading }}
    >
      {appState.loading ? "Uploading..." : "Upload"}
    </button>
    <code class="error">{appState.error?.message}</code>
    {#if import.meta.env.DEV && appState.error}
      <code class="error">{appState.error?.cause}</code>
    {/if}
  </form>
</main>

<style>
  :root {
    font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;

    color: #0f0f0f;
    background-color: #f6f6f6;

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }

  :global(html, body) {
    height: 100%;
    margin: 0;
  }

  .container {
    display: flex;
    flex-flow: column;
    padding: 5vh 1rem;
    height: 90vh;
    place-items: center;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: min(100%, 100ch);
    flex: 1 1 auto;
  }

  label {
    display: flex;
    flex-flow: row wrap;
    gap: 1rem;
  }

  select,
  textarea,
  button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    color: #0f0f0f;
    background-color: #ffffff;
    transition: border-color 0.25s;
    outline: none;
  }

  textarea {
    resize: none;
    flex-grow: 1;
  }

  select,
  button {
    max-width: fit-content;
  }

  button:hover:not([disabled]) {
    border-color: #396cd8;
  }
  button:active {
    border-color: #396cd8;
    background-color: #e8e8e8;
  }
  button[disabled] {
    color: #3f3f3f;
  }
  button.loading {
    background: repeating-linear-gradient(
      to right,
      white,
      #e5ad24,
      #e47128,
      #00878f,
      #62aeb2,
      white
    );
    background-size: 500%;
    animation: wave 10s linear infinite;
  }

  @keyframes wave {
    0% {
      background-position-x: 100%;
    }
    100% {
      background-position-x: -33%;
    }
  }

  .error {
    color: #790e00;
    white-space: pre-line;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color: #f6f6f6;
      background-color: #3f3f3f;
    }

    select,
    textarea,
    button {
      color: #ffffff;
      background-color: #0f0f0f98;
    }
    button:active {
      background-color: #0f0f0f69;
    }
    .error {
      color: #ff3333;
    }
  }
</style>
