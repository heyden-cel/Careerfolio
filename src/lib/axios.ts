import axios from 'axios'

const sid = localStorage.getItem('folio_sid')
if (sid) axios.defaults.headers.common['x-session-id'] = sid
