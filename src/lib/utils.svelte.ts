import { path } from "@tauri-apps/api";
import { create, mkdir } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";

export const makeSketch = async (
  code: string,
  sketchDir: string,
  filename: string
) => {
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

export const compileSketch = async (board: Board, sketchDir: string) => {
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

export const uploadSketch = async (board: Board, sketchDir: string) => {
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

export const getBoards = async () => {
  const { stdout, stderr, code } = await arduinoCli([
    "board",
    "list",
    "--json",
  ]);
  if (code !== 0) throw boardListError(stderr);
  return getMatchigBoards(stdout);
};

export const boardListError = (err: unknown) =>
  Error(
    `Could not get the lists of compatible boards. 
        Did you install arduino-cli?\n
        https://arduino.github.io/arduino-cli/0.22/installation/`,
    { cause: err }
  );

export const getMatchigBoards = (stdout: string) => {
  return getDetectedBoards(stdout).filter((port) =>
    port.hasOwnProperty("matching_boards")
  ) as BoardList;
};

export const getDetectedBoards = (stdout: string) => {
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

export const arduinoCli = async (args: string[]) => {
  try {
    const command = Command.sidecar("binaries/arduino-cli", args);
    return await command.execute();
  } catch (err) {
    throw Error("Command for the arduino-cli binary could not be executed.", {
      cause: err,
    });
  }
};

export const parseError = (err: unknown) => {
  if (err instanceof Error) {
    return err;
  } else {
    return Error("Unknown error", { cause: err });
  }
};
