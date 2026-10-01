// Only internal application pages can be used as login return destinations.
export function safeLoginTarget(value) {
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return null;
  try {
    const url=new URL(value,'https://internal.invalid');
    const pathname=decodeURIComponent(url.pathname);
    if(url.origin!=='https://internal.invalid'||pathname.startsWith('//')||/[\\\u0000-\u001f]/.test(pathname))return null;
    if(pathname==='/'||/^\/(?:admin|unlogged|api)(?:\/|$)/.test(pathname))return null;
    if(pathname==='/logged'||pathname==='/logged/')return '/dashboard'+url.search+url.hash;
    return url.pathname+url.search+url.hash;
  }catch{return null;}
}

export function loginUrl(target) {
  return '/?'+new URLSearchParams({next:safeLoginTarget(target) || '/dashboard'}).toString();
}

/** @param {string} search @param {string|null} legacyTarget */
export function loginDestination(search,legacyTarget=null) {
  const params=new URLSearchParams(search);
  // An explicit URL always takes precedence over an old browser value.
  return (params.has('next')?safeLoginTarget(params.get('next')):safeLoginTarget(legacyTarget)) || '/dashboard';
}
