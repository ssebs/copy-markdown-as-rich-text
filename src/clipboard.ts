import { spawn } from 'child_process';

export async function writeHtmlToClipboard(html: string, plainText: string): Promise<void> {
  switch (process.platform) {
    case 'win32': return writeWindows(html, plainText);
    case 'darwin': return writeMac(html, plainText);
    case 'linux': return writeLinux(html, plainText);
    default: throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function buildWindowsScript(htmlB64: string, textB64: string): string {
  // CF_HTML requires a descriptor header with byte offsets into the UTF-8 payload.
  // DataObject.SetData(DataFormats.Html, ...) does NOT add this header, so apps
  // reject the entry. We build it by hand and register it under "HTML Format".
  return `
Add-Type -AssemblyName System.Windows.Forms
$html = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${htmlB64}'))
$text = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${textB64}'))

$pre  = '<!--StartFragment-->'
$post = '<!--EndFragment-->'
$utf8 = [System.Text.Encoding]::UTF8
$headerFmt = "Version:0.9\`r\`nStartHTML:{0:0000000000}\`r\`nEndHTML:{1:0000000000}\`r\`nStartFragment:{2:0000000000}\`r\`nEndFragment:{3:0000000000}\`r\`n"
$headerLen = ($headerFmt -f 0,0,0,0).Length
$preLen  = $utf8.GetByteCount($pre)
$htmlLen = $utf8.GetByteCount($html)
$postLen = $utf8.GetByteCount($post)
$startHtml     = $headerLen
$startFragment = $startHtml + $preLen
$endFragment   = $startFragment + $htmlLen
$endHtml       = $endFragment + $postLen
$header = $headerFmt -f $startHtml, $endHtml, $startFragment, $endFragment
$cfHtml = $header + $pre + $html + $post

$data = New-Object System.Windows.Forms.DataObject
$data.SetData('HTML Format', $cfHtml)
$data.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $text)
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)
`.trim();
}

function writeWindows(html: string, plainText: string): Promise<void> {
  const htmlB64 = Buffer.from(html, 'utf8').toString('base64');
  const textB64 = Buffer.from(plainText, 'utf8').toString('base64');
  const script = buildWindowsScript(htmlB64, textB64);
  // -EncodedCommand expects UTF-16LE base64; bypasses all CLI quoting/stdin issues.
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  // -Sta is required for System.Windows.Forms.Clipboard.
  return run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Sta', '-EncodedCommand', encoded]);
}

function writeMac(html: string, plainText: string): Promise<void> {
  const htmlHex = Buffer.from(html, 'utf8').toString('hex').toUpperCase();
  const textHex = Buffer.from(plainText, 'utf8').toString('hex').toUpperCase();
  const script = `set the clipboard to {«class HTML»:«data HTML${htmlHex}», «class utf8»:«data utf8${textHex}»}`;
  return run('osascript', ['-e', script]);
}

function writeLinux(html: string, _plainText: string): Promise<void> {
  if (process.env.WAYLAND_DISPLAY) {
    return run('wl-copy', ['-t', 'text/html'], html);
  }
  return run('xclip', ['-selection', 'clipboard', '-t', 'text/html'], html);
}

function run(cmd: string, args: string[], stdin?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', err => reject(new Error(`Failed to run ${cmd}: ${err.message}`)));
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim()}`));
      }
    });
    if (stdin !== undefined) {
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
}
