import { useState, useEffect } from 'react'
import axios from 'axios'

function Admin({ token }) {
  const [movies, setMovies] = useState([])
  const [form, setForm] = useState({ title: '', genre: '', description: '', releaseYear: '' })
 const [file, setFile] = useState(null)
 const [editingId, setEditingId] = useState(null);
const [poster, setPoster] = useState(null)

  useEffect(() => {
    if (token) fetchMovies()
  }, [token])

  const fetchMovies = async () => {
    try {
      const res = await axios.get('/api/movies')
      setMovies(res.data.movies || res.data)
    } catch (err) {
      console.error(err)
    }
  }

 const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('genre', form.genre)
    formData.append('description', form.description)
    formData.append('releaseYear', form.releaseYear)
    if (file) formData.append('file', file)
    if (poster) formData.append('poster', poster)

    try {
      if (editingId) {
        await axios.put(`/api/movies/${editingId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        alert('Movie updated')
      } else {
        await axios.post('/api/movies', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        alert('Movie added')
      }
      fetchMovies()
      setForm({ title: '', genre: '', description: '', releaseYear: '' })
      setFile(null)
      setPoster(null)
      setEditingId(null)
    } catch (err) {
      alert(editingId ? 'Error updating movie' : 'Error adding movie')
    }
  }
  const deleteMovie = async (id) => {
    try {
      await axios.delete(`/api/movies/${id}`)
      fetchMovies()
    } catch (err) {
      alert('Error deleting movie')
    }
  }

const startEdit = (movie) => {
  setEditingId(movie._id);
  setForm({
    title: movie.title || '',
    genre: movie.genre || '',
    description: movie.description || '',
    releaseYear: movie.releaseYear || '',
  });
  setFile(null);
  setPoster(null);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
    const downloadMovie = async (movieId, title) => {
    try {
      const response = await axios.get(`/api/movies/${movieId}/download`, {
        responseType: 'blob',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${title || 'movie'}.mp4`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Error downloading movie')
    }
  }

  return (
    <div className="admin">
      <h2>Admin Panel</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
        <input placeholder="Genre" value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})} required />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
        <input type="number" placeholder="Release Year" value={form.releaseYear} onChange={(e) => setForm({...form, releaseYear: e.target.value})} />
       <input type="file" onChange={(e) => setFile(e.target.files[0])} />
<input type="file" accept="image/*" onChange={(e) => setPoster(e.target.files[0])} />
<button type="submit">{editingId ? 'Update Movie' : 'Add Movie'}</button>
      </form>
      <div className="movie-list">
        {movies.map(movie => (
          <div key={movie._id} className="movie-item">
            <h4>{movie.title}</h4>
            <button onClick={() => downloadMovie(movie._id, movie.title)}>Download</button>
<button onClick={() => startEdit(movie)}>Edit</button>
<button onClick={() => deleteMovie(movie._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Admin