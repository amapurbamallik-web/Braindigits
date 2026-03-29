const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  const helper = `  const safeSend = useCallback((channel: ReturnType<typeof supabase.channel> | null, payload: any) => {
    if (!channel) return;
    try {
      channel.send(payload);
    } catch (e) {
      console.warn('Failed to send message via Supabase RT', e);
    }
  }, []);

  const createRoom = useCallback(`;

  content = content.replace('  const createRoom = useCallback(', helper);
  content = content.replace(/channelRef\.current\.send\(/g, 'safeSend(channelRef.current, ');
  content = content.replace(/channel\.send\(/g, 'safeSend(channel, ');

  fs.writeFileSync(filepath, content);
  console.log(filepath + ' patched');
}

patchFile('src/hooks/useGameRoom.ts');
