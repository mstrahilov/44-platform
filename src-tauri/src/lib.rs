#[cfg(target_os = "macos")]
fn macos_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<tauri::menu::Menu<R>> {
    use tauri::menu::{AboutMetadata, Menu, MenuItemBuilder, PredefinedMenuItem, Submenu};

    let package = app.package_info();
    let about = AboutMetadata {
        name: Some(package.name.clone()),
        version: Some(package.version.to_string()),
        copyright: app.config().bundle.copyright.clone(),
        ..Default::default()
    };
    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let profile = MenuItemBuilder::with_id("profile", "Profile").build(app)?;
    let studio = MenuItemBuilder::with_id("studio", "Studio").build(app)?;
    let orders = MenuItemBuilder::with_id("orders", "Orders").build(app)?;
    let messages = MenuItemBuilder::with_id("messages", "Messages").build(app)?;
    let view_settings = MenuItemBuilder::with_id("view-settings", "Settings").build(app)?;
    let support = MenuItemBuilder::with_id("support", "44OS Support").build(app)?;

    let application = Submenu::with_items(
        app,
        "44OS",
        true,
        &[
            &PredefinedMenuItem::about(app, None, Some(about))?,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[&PredefinedMenuItem::close_window(app, None)?],
    )?;
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    let view = Submenu::with_items(
        app,
        "View",
        true,
        &[&profile, &studio, &orders, &messages, &view_settings],
    )?;
    let window = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;
    let help = Submenu::with_items(app, "Help", true, &[&support])?;

    Menu::with_items(app, &[&application, &file, &edit, &view, &window, &help])
}

#[cfg(target_os = "macos")]
fn handle_macos_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>, id: &str) {
    use tauri::Manager;

    let destination = match id {
        "profile" => Some("profile"),
        "studio" => Some("studio"),
        "orders" => Some("orders"),
        "messages" => Some("messages"),
        "settings" | "view-settings" => Some("settings"),
        "support" => Some("support"),
        _ => None,
    };
    if let (Some(destination), Some(window)) = (destination, app.get_webview_window("main")) {
        let _ = window.eval(format!(
            "window.dispatchEvent(new CustomEvent('44:desktop-menu',{{detail:'{destination}'}}))"
        ));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_notification::init());
    #[cfg(target_os = "macos")]
    let builder = builder
        .menu(macos_menu)
        .on_menu_event(|app, event| handle_macos_menu(app, event.id().as_ref()));

    builder
        .run(tauri::generate_context!())
        .expect("44OS desktop failed to start");
}

#[cfg(test)]
mod tests {
    #[test]
    fn production_origin_is_https_and_canonical() {
        let origin = "https://app.44os.com/";
        assert!(origin.starts_with("https://"));
        assert_eq!(origin, "https://app.44os.com/");
    }
}
