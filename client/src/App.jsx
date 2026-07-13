import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import axios from 'axios'
import './App.css'
import Home from './components/Home'
import Login from './components/Login'
import Admin from './components/Admin'

axios.defaults.baseURL = import.meta.env.VITE_API_URL

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    }
    document.body.className = darkMode ? 'dark' : 'light'
  }, [token, darkMode])

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/users/profile')
      setUser(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const login = (newToken) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    localStorage.setItem('darkMode', !darkMode)
  }

  return (
    <Router>
      <div className="App">
        <nav>
          <h1>Movies App</h1>
          <div>
            <button onClick={toggleDarkMode}>{darkMode ? 'Light' : 'Dark'} Mode</button>
            {token ? (
              <div>
                <span>Welcome, {user?.username}</span>
                <button onClick={logout}>Logout</button>
                {user?.role === 'admin' && <a href="/admin">Admin</a>}
              </div>
            ) : (
              <a href="/login">Login</a>
            )}
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Home token={token} />} />
          <Route path="/login" element={<Login onLogin={login} />} />
          <Route path="/admin" element={<Admin token={token} />} />
        </Routes>
        <footer>
          <p>&copy; 2026 MovieStream. Built with ❤️ using React & Node.js</p>
        </footer>
      </div>
    </Router>
  )
}

export default App