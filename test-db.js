const url = 'https://ufllyyzrzdjekxtuxxug.supabase.co/rest/v1/profiles?select=*';
const key = 'sb_publishable_2s2uPOSamedKI5eJjzvb3Q__H1aiLhb';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => console.log('DATA:', data))
.catch(err => console.error(err));
