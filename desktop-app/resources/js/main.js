/*
    Function to set up a system tray menu with options specific to the window mode.
    This function checks if the application is running in window mode, and if so,
    it defines the tray menu items and sets up the tray accordingly.
*/
function setTray() {
  // Tray menu is only available in window mode
  if (NL_MODE != "window") {
    console.log("INFO: Tray menu is only available in the window mode.");
    return;
  }

  // Define tray menu items
  let tray = {
    icon: "/resources/assets/icon.jpg",
    menuItems: [
      { id: "VERSION", text: "Get version" },
      { id: "SEP", text: "-" },
      { id: "QUIT", text: "Quit" },
    ],
  };

  // Set the tray menu
  Neutralino.os.setTray(tray);
}

/*
    Function to handle click events on the tray menu items.
    This function performs different actions based on the clicked item's ID,
    such as displaying version information or exiting the application.
*/
function onTrayMenuItemClicked(event) {
  switch (event.detail.id) {
    case "VERSION":
      // Display version information
      Neutralino.os.showMessageBox(
        "Version information",
        `Neutralinojs server: v${NL_VERSION}\nNeutralinojs client: v${NL_CVERSION}\nOS Name: ${NL_OS}\nArchitecture: ${NL_ARCH}\nApplication ID: ${NL_APPID}\nApplication Version: ${NL_APPVERSION}\nPort: ${NL_PORT}\nMode: ${NL_MODE}\nNeutralinojs server: v${NL_VERSION}\nNeutralinojs client: v${NL_CVERSION}\nCurrent working directory: ${NL_CWD}\nApplication path: ${NL_PATH}\nApplication data path: ${NL_DATAPATH}\nCommand-line arguments: ${NL_ARGS}\nProcess ID: ${NL_PID}\nResource mode: ${NL_RESMODE}\nExtensions enabled: ${NL_EXTENABLED}\nFramework binary's release commit hash: ${NL_COMMIT}\nClient library's release commit hash: ${NL_CCOMMIT}\nCustom method identifiers: ${NL_CMETHODS}\nInitial window state was loaded from the saved configuration: ${NL_WSAVSTLOADED}\nUser System Locale: ${NL_LOCALE}\nData passed during the framework binary compilation via the NEU_COMPILATION_DATA definition in the BuildZri configuration file: ${NL_COMPDATA}`,
      );
      break;
    case "QUIT":
      // Exit the application
      Neutralino.app.exit();
      break;
  }
}

/*
    Function to handle the window close event by gracefully exiting the Neutralino application.
*/
function onWindowClose() {
  Neutralino.app.exit();
}

// Initialize Neutralino
Neutralino.init();

// Register event listeners
Neutralino.events.on("trayMenuItemClicked", onTrayMenuItemClicked);
Neutralino.events.on("windowClose", onWindowClose);

// Conditional initialization: Set up system tray if not running on macOS
if (NL_OS != "Darwin") {
  // TODO: Fix https://github.com/neutralinojs/neutralinojs/issues/615
  setTray();
}
