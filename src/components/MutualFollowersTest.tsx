'use client'

import { useState } from 'react'
import { useMutualFollowers } from '../hooks/useMutualFollowers'

export default function MutualFollowersTest() {
  const [testFid, setTestFid] = useState<number | null>(null)
  const [inputFid, setInputFid] = useState('')
  
  const { mutualFollowers, loading, error, lastUpdated, refetch, refresh } = useMutualFollowers(testFid)

  const handleTest = () => {
    const fid = parseInt(inputFid)
    if (!isNaN(fid) && fid > 0) {
      setTestFid(fid)
    }
  }

  const handleClear = () => {
    setTestFid(null)
    setInputFid('')
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-6">
      <h3 className="text-xl font-bold text-white mb-4">🧪 Neynar API Test</h3>
      
      <div className="space-y-4">
        {/* Test Input */}
        <div className="flex gap-2">
          <input
            type="number"
            value={inputFid}
            onChange={(e) => setInputFid(e.target.value)}
            placeholder="Enter FID to test (e.g., 3)"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
          />
          <button
            onClick={handleTest}
            disabled={!inputFid || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium"
          >
            Test API
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
          >
            Clear
          </button>
        </div>

        {/* Controls */}
        {testFid && (
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm"
            >
              Refetch (Cache)
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded text-sm"
            >
              Refresh (No Cache)
            </button>
          </div>
        )}

        {/* Status */}
        {testFid && (
          <div className="text-sm text-gray-300">
            <p>Testing FID: <span className="text-blue-400">{testFid}</span></p>
            {lastUpdated && (
              <p>Last Updated: <span className="text-green-400">{lastUpdated.toLocaleTimeString()}</span></p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching mutual followers...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && testFid && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">
                Mutual Followers ({mutualFollowers.length})
              </h4>
            </div>

            {mutualFollowers.length === 0 ? (
              <p className="text-gray-400 text-sm">No mutual followers found</p>
            ) : (
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {mutualFollowers.map((follower) => (
                  <div
                    key={follower.fid}
                    className="flex items-center gap-3 p-2 bg-gray-700 rounded"
                  >
                    {follower.pfpUrl && (
                      <img
                        src={follower.pfpUrl}
                        alt={follower.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {follower.displayName}
                      </p>
                      <p className="text-gray-400 text-sm">
                        @{follower.username} • FID {follower.fid}
                      </p>
                      {follower.bio && (
                        <p className="text-gray-300 text-xs truncate mt-1">
                          {follower.bio}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>{follower.followerCount} followers</p>
                      <p>{follower.followingCount} following</p>
                      {follower.isVerified && (
                        <span className="text-blue-400">✓ Verified</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 