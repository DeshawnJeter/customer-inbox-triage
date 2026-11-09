import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()
  
  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 sm:h-16 sm:py-0">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center space-x-2 hover:opacity-80">
            <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl">
              📧
            </div>
            <div>
              <div className="font-bold text-base whitespace-nowrap sm:text-lg">Relay AI</div>
              <div className="text-xs text-blue-200 whitespace-nowrap">Customer Triage</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex w-full space-x-1 overflow-x-auto sm:w-auto">
            <Link
              to="/"
              className={`shrink-0 whitespace-nowrap px-3 py-2 rounded sm:px-4 ${
                isActive('/') 
                  ? 'bg-blue-700 font-semibold' 
                  : 'hover:bg-blue-500'
              }`}
            >
              Home
            </Link>
            <Link
              to="/analyze"
              className={`shrink-0 whitespace-nowrap px-3 py-2 rounded sm:px-4 ${
                isActive('/analyze') 
                  ? 'bg-blue-700 font-semibold' 
                  : 'hover:bg-blue-500'
              }`}
            >
              Analyze
            </Link>
            <Link
              to="/history"
              className={`shrink-0 whitespace-nowrap px-3 py-2 rounded sm:px-4 ${
                isActive('/history') 
                  ? 'bg-blue-700 font-semibold' 
                  : 'hover:bg-blue-500'
              }`}
            >
              History
            </Link>
            <Link
              to="/dashboard"
              className={`shrink-0 whitespace-nowrap px-3 py-2 rounded sm:px-4 ${
                isActive('/dashboard') 
                  ? 'bg-blue-700 font-semibold' 
                  : 'hover:bg-blue-500'
              }`}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
