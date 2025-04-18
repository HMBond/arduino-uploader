<script lang="ts">
  // import { invoke } from "@tauri-apps/api/core";
  import { Command } from "@tauri-apps/plugin-shell";
  import { onMount } from "svelte";
  import Logo from "../components/Logo.svelte";
  import exampleCode from "../exampleCode.ino?raw";
  import { appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
  import { create, mkdir } from "@tauri-apps/plugin-fs";

  let code = $state(exampleCode);
  let boardList = $state<BoardList | []>([]);
  let error = $state("");
  let loading = $state(true);

  onMount(async () => {
    loading = true;
    // await invoke<string>("mount", { name: code })
    //   .then((result) => {
    //     boardList = getBoards(result);
    //     error = "";
    //   })
    //   .catch(setError);
    const { stdout, stderr } = await arduinoCli(["board", "list", "--json"]);
    if (stderr) {
      console.error(stderr);
      boardList = [];
      error = `Could not get the lists of compatible boards.
                Did you install arduino-cli?\n\n
                How to install arduino-cli: https://arduino.github.io/arduino-cli/0.22/installation/`;
    } else {
      boardList = getBoards(stdout);
      error = "";
    }
    loading = false;
    error = await appLocalDataDir();
  });

  async function upload(event: SubmitEvent) {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const index = parseInt(formData.get("board")?.toString() || "");
    const board = boardList.at(index)!;
    const appDataPath = await appLocalDataDir();
    const path = `${appDataPath}/TemporarySketch`;
    console.log(path);
    const filename = "TemporarySketch.ino";

    loading = true;

    await makeSketch(path, filename);

    error = await compileSketch(board, path);

    if (!error) {
      error = await uploadSketch(board, path);
    }

    loading = false;
  }

  const makeSketch = async (path: string, filename: string) => {
    await mkdir("TemporarySketch", { baseDir: BaseDirectory.AppLocalData });
    const file = await create(`TemporarySketch/${filename}`, {
      baseDir: BaseDirectory.AppLocalData,
    });
    await file.write(new TextEncoder().encode("Hello world"));
    await file.close();
  };

  const compileSketch = async (board: Board, path: string) => {
    const { stderr } = await arduinoCli([
      "compile",
      "-b",
      board.matching_boards[0].fqbn,
      path,
      "--export-binaries",
    ]);

    return stderr ? `Could not compile your code...\n\n ${stderr}` : "";
  };

  const uploadSketch = async (board: Board, path: string) => {
    const { stderr, code } = await arduinoCli([
      "upload",
      path,
      "-p",
      board.port.address,
    ]);

    return code && code > 0
      ? `Could not upload to the following address: ${board.port.address}\n\n ${stderr}`
      : "";
  };

  const getBoards = (result: string): BoardList => {
    const detectedPorts: DetectedPorts = JSON.parse(result).detected_ports;
    return detectedPorts.filter((port) =>
      port.hasOwnProperty("matching_boards")
    ) as BoardList;
  };

  const setError = (err: string) => (error = err);

  const arduinoCli = async (args: string[]) => {
    const command = Command.sidecar("binaries/arduino-cli", args);
    return await command.execute();
  };
</script>

<main class="container">
  <Logo {loading} />
  <form onsubmit={upload}>
    <label for="board">
      Select your Arduino board:
      <select
        id="board"
        name="board"
        disabled={boardList.length === 0}
        required
      >
        {#each boardList as board, index}
          <option value={index}>
            {board.port.protocol_label} -
            {board.matching_boards.map((b) => b.name).join(" & ")}
          </option>
        {:else}
          <option>Please connect a board...</option>
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
    <button type="submit" disabled={boardList.length === 0}>Upload</button>
    <code class="error">{error}</code>
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
  /* 
  a {
    font-weight: 500;
    color: #646cff;
    text-decoration: inherit;
  }

  a:hover {
    color: #535bf2;
  } */

  /* input, */
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

  button[type="submit"] {
    margin-left: auto;
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

  .error {
    color: #790e00;
    white-space: pre-line;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color: #f6f6f6;
      background-color: #3f3f3f;
    }

    /* a:hover {
      color: #24c8db;
    } */

    /* input, */
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
