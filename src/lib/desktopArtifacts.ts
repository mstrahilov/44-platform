import 'server-only';

export const localDesktopArtifacts = {
  mac: {
    relativePath: 'src-tauri/target/universal-apple-darwin/release/bundle/dmg/44OS_0.1.0_universal.dmg',
    filename: '44OS-0.1.0-mac-universal.dmg',
    contentType: 'application/x-apple-diskimage',
    label: 'Mac',
  },
  windows: {
    relativePath: 'src-tauri/target/windows-x64/44OS-0.1.0-windows-x64-setup.exe',
    filename: '44OS-0.1.0-windows-x64-setup.exe',
    contentType: 'application/vnd.microsoft.portable-executable',
    label: 'Windows',
  },
} as const;

export type LocalDesktopPlatform = keyof typeof localDesktopArtifacts;
