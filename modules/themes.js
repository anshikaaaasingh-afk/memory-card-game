/* modules/themes.js
   Each built-in theme is just an array of emoji "faces". Custom themes
   use base64 images uploaded by the player instead. Grids up to 10x10
   need 50 unique faces, so each set has 50 entries; smaller boards just
   use a slice of the array. */

export const THEMES = {
  animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈'],
  space: ['🚀','🛸','🪐','🌎','🌍','🌏','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','☄️','⭐','🌟','✨','💫','🌌','🛰️','👨‍🚀','👩‍🚀','🔭','🌠','🪨','🌞','🌛','🌝','🌚','🧑‍🚀','🛰️','🌌','⚡','🔥','💥','🌪️','🌈','☁️','⛅','🌤️','🌩️','🌊','❄️','⚙️','🔧','🔩','🪫','🔋','💡'],
  programming: ['💻','⌨️','🖥️','🖱️','🐛','⚙️','🔧','🧠','📟','💾','💿','📀','🔌','🔋','🖨️','📡','🕹️','🧮','📊','📈','📉','🗂️','📁','📂','🔍','🔒','🔑','🛠️','🧩','⚡','🌐','☁️','🔗','📝','📋','🧵','🪲','🚦','🎛️','🔬','🧪','🧬','🖊️','📌','🗃️','🖇️','📎','🔖','🏷️','🧾','🗄️'],
  sports: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🏒','🏑','🥍','🏏','🥊','🥋','🎽','⛳','🏹','🎣','🤿','🥌','🛼','🛹','🏂','⛷️','🏋️','🤸','🤺','🏇','🚴','🏊','🏄','🚣','🧗','🥇','🥈','🥉','🏆','🏅','🎖️','🥏','🏆','🎳','🛷','🥊','🏓','🎯','🪂'],
  food: ['🍎','🍌','🍇','🍓','🍒','🍑','🍍','🥝','🥑','🍅','🌽','🥕','🥔','🍕','🍔','🌭','🥪','🌮','🌯','🍜','🍝','🍣','🍱','🍤','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','🍦','🍨','🍿','🥨','🥐','🥯','🧀','🥞','🧇','🍳','🥓','🍗','🍖','🥗','🍇','🍉','🍋','🥥'],
  countries: ['🇮🇳','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇯🇵','🇰🇷','🇨🇳','🇧🇷','🇨🇦','🇦🇺','🇮🇹','🇪🇸','🇷🇺','🇿🇦','🇲🇽','🇳🇱','🇸🇪','🇨🇭','🇳🇴','🇦🇷','🇪🇬','🇹🇷','🇮🇩','🇹🇭','🇻🇳','🇵🇭','🇵🇰','🇳🇬','🇰🇪','🇬🇷','🇵🇹','🇵🇱','🇦🇹','🇮🇪','🇳🇿','🇸🇬','🇦🇪','🇸🇦','🇮🇱','🇺🇦','🇫🇮','🇩🇰','🇧🇪','🇨🇱','🇨🇴','🇵🇪','🇲🇾','🇧🇩','🇶🇦']
};

export function themeLabel(key) {
  const labels = { animals:'Animals', space:'Space', programming:'Programming', sports:'Sports', food:'Food', countries:'Countries', custom:'Custom' };
  return labels[key] || key;
}

/** Returns `count` unique "faces" for a theme. Faces are either emoji
 *  strings or {img: base64} objects for the custom theme. */
export function getFaces(themeKey, count, customImages) {
  if (themeKey === 'custom' && customImages && customImages.length >= count) {
    return customImages.slice(0, count).map(src => ({ img: src }));
  }
  const set = THEMES[themeKey] || THEMES.animals;
  if (set.length >= count) return set.slice(0, count);
  // not enough symbols for a huge board — cycle through with a variant marker
  const out = [];
  for (let i = 0; i < count; i++) out.push(set[i % set.length] + (i >= set.length ? '\u200D' : ''));
  return out;
}
