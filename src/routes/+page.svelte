<script lang="ts">
  import { Command } from "@tauri-apps/plugin-shell";
  import { onMount } from "svelte";
  import Logo from "../components/Logo.svelte";
  import exampleCode from "../exampleCode.ino?raw";
  import * as path from "@tauri-apps/api/path";
  import { create, mkdir, remove } from "@tauri-apps/plugin-fs";
  import {
    getBoards,
    makeSketch,
    compileSketch,
    uploadSketch,
    parseError,
  } from "../lib/utils.svelte";

  let code = $state(exampleCode);
  let boardList = $state<BoardList>([]);
  let error = $state<Error | null>(null);
  let loading = $state(false);
  let uploading = $state(false);

  onMount(async () => {
    error = null;
    loading = true;
    boardList = await getBoards().catch((err) => {
      error = parseError(err);
      return [];
    });
    loading = false;
  });

  async function upload(event: SubmitEvent) {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const index = parseInt(formData.get("board-index")?.toString() || "");
    const board = boardList.at(index)!;
    const sketchDir = await path.join(await path.tempDir(), "/TemporarySketch");
    const filename = "TemporarySketch.ino";

    error = null;
    uploading = true;
    try {
      await makeSketch(code, sketchDir, filename);
      await compileSketch(board, sketchDir);
      await uploadSketch(board, sketchDir);
    } catch (err) {
      error = parseError(err);
    }
    uploading = false;
  }
</script>

<main class="container">
  <Logo {loading} />
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
      disabled={boardList.length === 0 || uploading}
      class={{ loading: uploading }}
    >
      Upload
    </button>
    <code class="error">{error?.message}</code>
    {#if import.meta.env.DEV && error}
      <code class="error">{error?.cause}</code>
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
    color: #6e6e6e;
  }
  button[disabled].loading {
    color: #0f0f0f;
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
