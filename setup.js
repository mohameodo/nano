import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const configPath = path.resolve('src/components/poprink/config.poprink.ts');

const ask = (query, defaultValue) => {
  return new Promise((resolve) => {
    rl.question(`${query} [${defaultValue}]: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
};

const main = async () => {
  console.log('poprink nano setup');
  const name = await ask('Site / App Name', 'poprink');
  const hue = await ask('Theme Color Hue (0-360)', '310');
  const desc = await ask('Site Description', 'a minimalist web interface for poprink. search for movies and tv shows instantly without bloat.');
  const server = await ask('Default Video Server (vidzeeWorks)', 'vidzeeWorks');
  const auth = await ask('Enable Authentication (y/n)', 'n');
  const vidstack = await ask('Use Vidstack Player (y/n)', 'y');
  const trending = await ask('Show Trending Section (y/n)', 'n');

  rl.close();

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found at: ${configPath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(configPath, 'utf8');

  content = content.replace(/(text:\s*["'])[^"']*(["'])/, `$1${name}$2`);
  content = content.replace(/(defaultHue:\s*)\d+/, `$1${hue}`);
  content = content.replace(/(description:\s*["'])[^"']*(["'])/, `$1${desc}$2`);
  content = content.replace(/(defaultServer:\s*["'])[^"']*(["'])/, `$1${server}$2`);
  
  const authVal = auth.toLowerCase() === 'y' || auth.toLowerCase() === 'yes' ? 'true' : 'false';
  content = content.replace(/(enableAuth:\s*)(true|false)/, `$1${authVal}`);

  const vidstackVal = vidstack.toLowerCase() === 'y' || vidstack.toLowerCase() === 'yes' ? 'true' : 'false';
  content = content.replace(/(useVidstack:\s*)(true|false)/, `$1${vidstackVal}`);

  const trendingVal = trending.toLowerCase() === 'y' || trending.toLowerCase() === 'yes' ? 'true' : 'false';
  content = content.replace(/(showTrending:\s*)(true|false)/, `$1${trendingVal}`);

  fs.writeFileSync(configPath, content, 'utf8');
  console.log('Config updated successfully in config.poprink.ts');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
