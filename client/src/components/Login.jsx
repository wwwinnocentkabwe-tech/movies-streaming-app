import { useState } from 'react'
import axios from 'axios'

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isLogin) {
        const res = await axios.post('/api/users/login', { email: form.email, password: form.password })
        onLogin(res.data.token)
      } else {
        await axios.post('/api/users/register', form)
        alert('Registered successfully')
        setIsLogin(true)
      }
    } catch (err) {
      alert(isLogin ? 'Login failed' : 'Registration failed')
    }
  }

  return (
    <div className="auth">
      <form onSubmit={handleSubmit}>
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        {!isLogin && <input placeholder="Username" required onChange={(e) => setForm({...form, username: e.target.value})} />}
        <input type="email" placeholder="Email" required onChange={(e) => setForm({...form, email: e.target.value})} />
        <input type="password" placeholder="Password" required onChange={(e) => setForm({...form, password: e.target.value})} />
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        <button type="button" onClick={() => setIsLogin(!isLogin)}>Switch to {isLogin ? 'Register' : 'Login'}</button>
      </form>
    </div>
  )
}

export default Login