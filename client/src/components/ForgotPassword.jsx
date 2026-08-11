import { useState } from 'react'
import axios from 'axios'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const res = await axios.post('/api/users/forgot-password', { email })
      setMessage(res.data.message)
    } catch (err) {
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="auth-page">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}

export default ForgotPassword