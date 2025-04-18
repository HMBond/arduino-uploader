// use serde_json::json;
// use std::{fs, process::Command};

// #[tauri::command(async)]
// async fn mount() -> Result<String, String> {
//     let schema = json!({"type": "object"});
//     let validator = jsonschema::validator_for(&schema).expect("Could not build validator");

//     let result = match execute("arduino-cli board list --json".to_string()) {
//         Ok(result) => result,
//         Err(error) => {
//             return Err(format!(
//                 "Could not get the lists of compatible boards.\n
//             Did you install arduino-cli?\n
//             See how: https://arduino.github.io/arduino-cli/0.22/installation/\n\n
//             {}",
//                 error
//             )
//             .to_string())
//         }
//     };

//     let instance =
//         serde_json::from_str::<serde_json::Value>(&result).expect("Could not parse JSON result");
//     if validator.validate(&instance).is_ok() {
//         return Ok(result);
//     } else {
//         return Err(format!("The aduino-cli did not provide valid JSON data while requesting a list of connected boards..\n\nResult: {}", result));
//     }
// }

// #[tauri::command(async)]
// async fn upload(port: String, fqbn: String, code: String) -> Result<(), String> {
//     fs::write("../TemporarySketch/TemporarySketch.ino", code).unwrap();

//     let compile = execute(format!(
//         "arduino-cli compile -b {} ../TemporarySketch --export-binaries",
//         &fqbn
//     ));

//     if compile.is_err() {
//         return Err("Could not compile your code...".to_string());
//     }

//     execute(format!(
//         "arduino-cli upload ../TemporarySketch -p {}",
//         &port
//     ))
//     .expect("Could not upload the code");

//     Ok(())
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// fn execute(command: String) -> Result<String, String> {
//     let output = if cfg!(target_os = "windows") {
//         Command::new("cmd")
//             .args(["/C", &command])
//             .output()
//             .expect("Could not execute command")
//     } else {
//         Command::new("sh")
//             .arg("-c")
//             .arg(&command)
//             .output()
//             .expect("Could not execute command")
//     };

//     if output.status.success() {
//         return Ok(String::from_utf8(output.stdout).expect("Could not parse stdout to string"));
//     } else {
//         return Err(String::from_utf8(output.stderr).expect("Could not parse stderr to string"));
//     }
// }
