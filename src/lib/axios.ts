import axios from 'axios'

axios.defaults.withCredentials = true

const sid = localStorage.getItem('folio_sid')
if (sid) axios.defaults.headers.common['x-session-id'] = sid
