import { useState, useEffect } from 'react'
import axios from 'axios'

function Home({ token }) {
  const [movies, setMovies] = useState([])
  const [filteredMovies, setFilteredMovies] = useState([])
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) fetchMovies()
  }, [token, page])

  useEffect(() => {
    filterMovies()
  }, [movies, search, genre])

  const fetchMovies = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/movies?page=${page}&limit=10`)
      setMovies(res.data.movies || res.data)
      setTotalPages(res.data.totalPages || 1)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const filterMovies = () => {
    let filtered = movies
    if (search) {
      filtered = filtered.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
    }
    if (genre) {
      filtered = filtered.filter(m => m.genre === genre)
    }
    setFilteredMovies(filtered)
  }

  const addToFavorites = async (movieId) => {
    try {
      await axios.post(`/api/users/favorites/${movieId}`)
      alert('Added to favorites')
    } catch (err) {
      alert('Error adding to favorites')
    }
  }

  const rateMovie = async (movieId, rating) => {
    try {
      await axios.post(`/api/movies/${movieId}/rate`, { rating: parseInt(rating) })
      alert('Rated successfully')
      fetchMovies()
    } catch (err) {
      alert('Error rating movie')
    }
  }

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

  const genres = [...new Set(movies.map(m => m.genre))]

  return (
    <div>
      <div className="hero">
        <h2> Welcome to MovieStream</h2>
        <p>Discover, rate, and stream your favorite movies in style!</p>
      </div>
    <div>
      <div className="filters">
        <input type="text" placeholder="Search movies..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">All Genres</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        {loading ? <p>Loading...</p> : (
          <div className="movies">
            {filteredMovies.map(movie => (
              <div className="movie-card" key={movie._id}>
                <h3>{movie.title}</h3>
                <p>{movie.genre} - {movie.releaseYear}</p>
                <p>{movie.description}</p>
                <p>Rating: {movie.averageRating ? movie.averageRating.toFixed(1) : 'N/A'}</p>
                <input type="number" min="1" max="5" placeholder="Rate 1-5" onChange={(e) => rateMovie(movie._id, e.target.value)} />
                <button onClick={() => addToFavorites(movie._id)}>Add to Favorites</button>
                <button onClick={() => downloadMovie(movie._id, movie.title)}>Download Movie</button>
                <video controls width="300">
                  <source src={`/api/movies/${movie._id}/stream`} type="video/mp4" />
                </video>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  </div>
)
}

export default Home
