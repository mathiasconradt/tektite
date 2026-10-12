cask "tektite" do
  version "0.1.74"
  sha256 :no_check

  on_arm do
    url "https://github.com/mathiasconradt/tektite/releases/download/v#{version}/Tektite-macOS-arm64.zip"
  end
  on_intel do
    url "https://github.com/mathiasconradt/tektite/releases/download/v#{version}/Tektite-macOS-x64.zip"
  end

  name "Tektite"
  desc "Local-first Markdown knowledge base desktop app"
  homepage "https://github.com/mathiasconradt/tektite"

  depends_on :macos

  app "Tektite.app"

  preflight_steps do
    run "/usr/bin/xattr", args: ["-cr", "{{staged_path}}/Tektite.app"]
  end

  zap trash: [
    "~/Library/Application Support/Tektite",
    "~/Library/Preferences/com.electron.tektite.plist",
    "~/Library/Saved Application State/com.electron.tektite.savedState",
  ]
end
