// utils/cache.js
// Minimal caching system for HIPAA-compliant chat

import { logChatEvent } from './logger.js';
import { getConfig } from '../config/index.js';

// Cache storage
const caches = {};

// Default cache options
const DEFAULT_OPTIONS = {
  maxItems: 100,           // Maximum number of items in cache
  ttl: 5 * 60 * 1000,      // Time to live (5 minutes)
  checkInterval: 60 * 1000, // Cleanup interval (1 minute)
  enableLogging: false     // Log cache operations
};

/**
 * Create a new cache or get existing cache
 * @param {string} name - Cache name
 * @param {Object} options - Cache options
 * @returns {Object} Cache methods
 */
export function createCache(name, options = {}) {
  if (!name) {
    console.error('[Cache] Cache name is required');
    return null;
  }
  
  // Return existing cache if available
  if (caches[name]) {
    return caches[name].api;
  }
  
  // Merge options with defaults
  const cacheOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  
  // Create cache storage
  const cache = {
    name,
    options: cacheOptions,
    data: new Map(),
    stats: {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      lastCleanup: Date.now()
    },
    cleanupTimer: null
  };
  
  // API for the cache
  const cacheApi = {
    get: (key, defaultValue) => get(cache, key, defaultValue),
    set: (key, value, itemOptions) => set(cache, key, value, itemOptions),
    delete: (key) => deleteItem(cache, key),
    has: (key) => has(cache, key),
    clear: () => clear(cache),
    getStats: () => getStats(cache),
    keys: () => Array.from(cache.data.keys()),
    size: () => cache.data.size,
    destroy: () => destroyCache(name)
  };
  
  // Store API reference
  cache.api = cacheApi;
  
  // Store cache
  caches[name] = cache;
  
  // Start cleanup timer
  if (cacheOptions.ttl > 0 && cacheOptions.checkInterval > 0) {
    cache.cleanupTimer = setInterval(() => {
      cleanup(cache);
    }, cacheOptions.checkInterval);
  }
  
  // Log creation
  if (cacheOptions.enableLogging) {
    logChatEvent('cache', 'Cache created', { name });
  }
  
  return cacheApi;
}

/**
 * Get an item from the cache
 * @param {Object} cache - Cache object
 * @param {string} key - Item key
 * @param {any} defaultValue - Default value if item not found
 * @returns {any} Cached value or default
 */
function get(cache, key, defaultValue = null) {
  if (!key) return defaultValue;
  
  if (!cache.data.has(key)) {
    // Cache miss
    cache.stats.misses++;
    
    if (cache.options.enableLogging) {
      logChatEvent('cache', 'Cache miss', { 
        cache: cache.name, 
        key 
      });
    }
    
    return defaultValue;
  }
  
  const item = cache.data.get(key);
  
  // Check expiration
  if (item.expiry && item.expiry < Date.now()) {
    // Expired
    cache.data.delete(key);
    cache.stats.evictions++;
    
    if (cache.options.enableLogging) {
      logChatEvent('cache', 'Cache item expired', { 
        cache: cache.name, 
        key 
      });
    }
    
    return defaultValue;
  }
  
  // Cache hit
  cache.stats.hits++;
  
  // Log if enabled
  if (cache.options.enableLogging) {
    logChatEvent('cache', 'Cache hit', { 
      cache: cache.name, 
      key 
    });
  }
  
  // Update last access
  item.lastAccess = Date.now();
  
  return item.value;
}

/**
 * Set an item in the cache
 * @param {Object} cache - Cache object
 * @param {string} key - Item key
 * @param {any} value - Item value
 * @param {Object} itemOptions - Item-specific options
 * @returns {boolean} Success status
 */
function set(cache, key, value, itemOptions = {}) {
  if (!key) return false;
  
  // Check cache size and evict if needed
  if (cache.data.size >= cache.options.maxItems) {
    evictItem(cache);
  }
  
  // Calculate expiry
  const ttl = itemOptions.ttl !== undefined ? itemOptions.ttl : cache.options.ttl;
  const expiry = ttl > 0 ? Date.now() + ttl : null;
  
  // Create cache item
  const item = {
    key,
    value,
    created: Date.now(),
    lastAccess: Date.now(),
    expiry,
    priority: itemOptions.priority || 0
  };
  
  // Store item
  cache.data.set(key, item);
  cache.stats.sets++;
  
  // Log if enabled
  if (cache.options.enableLogging) {
    logChatEvent('cache', 'Cache item set', { 
      cache: cache.name, 
      key,
      ttl
    });
  }
  
  return true;
}

/**
 * Delete an item from the cache
 * @param {Object} cache - Cache object
 * @param {string} key - Item key
 * @returns {boolean} True if item was deleted
 */
function deleteItem(cache, key) {
  if (!key || !cache.data.has(key)) return false;
  
  cache.data.delete(key);
  cache.stats.deletes++;
  
  // Log if enabled
  if (cache.options.enableLogging) {
    logChatEvent('cache', 'Cache item deleted', { 
      cache: cache.name, 
      key 
    });
  }
  
  return true;
}

/**
 * Check if an item exists in the cache and is not expired
 * @param {Object} cache - Cache object
 * @param {string} key - Item key
 * @returns {boolean} True if item exists and is valid
 */
function has(cache, key) {
  if (!key || !cache.data.has(key)) return false;
  
  const item = cache.data.get(key);
  
  // Check expiration
  if (item.expiry && item.expiry < Date.now()) {
    // Expired
    cache.data.delete(key);
    cache.stats.evictions++;
    return false;
  }
  
  return true;
}

/**
 * Clear all items from the cache
 * @param {Object} cache - Cache object
 * @returns {boolean} Success status
 */
function clear(cache) {
  const size = cache.data.size;
  cache.data.clear();
  
  // Log if enabled
  if (cache.options.enableLogging) {
    logChatEvent('cache', 'Cache cleared', { 
      cache: cache.name, 
      itemsRemoved: size 
    });
  }
  
  return true;
}

/**
 * Get cache statistics
 * @param {Object} cache - Cache object
 * @returns {Object} Cache statistics
 */
function getStats(cache) {
  return {
    ...cache.stats,
    size: cache.data.size,
    maxSize: cache.options.maxItems,
    hitRate: cache.stats.hits / (cache.stats.hits + cache.stats.misses || 1)
  };
}

/**
 * Evict an item from the cache using policy
 * @param {Object} cache - Cache object
 */
function evictItem(cache) {
  // No items to evict
  if (cache.data.size === 0) return;
  
  // Get cache policy
  const policy = getConfig('cache.evictionPolicy', 'lru');
  
  switch (policy) {
    case 'lru': // Least Recently Used
      evictLRU(cache);
      break;
    case 'lfu': // Least Frequently Used (approximated by hit count)
      evictLFU(cache);
      break;
    case 'fifo': // First In, First Out
      evictFIFO(cache);
      break;
    case 'priority': // Priority based
      evictByPriority(cache);
      break;
    default:
      evictLRU(cache); // Default to LRU
  }
}

/**
 * Evict using Least Recently Used policy
 * @param {Object} cache - Cache object
 */
function evictLRU(cache) {
  let oldest = null;
  let oldestKey = null;
  
  // Find least recently accessed item
  for (const [key, item] of cache.data.entries()) {
    if (!oldest || item.lastAccess < oldest.lastAccess) {
      oldest = item;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    cache.data.delete(oldestKey);
    cache.stats.evictions++;
    
    // Log if enabled
    if (cache.options.enableLogging) {
      logChatEvent('cache', 'Cache item evicted (LRU)', { 
        cache: cache.name, 
        key: oldestKey 
      });
    }
  }
}

/**
 * Evict using First In, First Out policy
 * @param {Object} cache - Cache object
 */
function evictFIFO(cache) {
  let oldest = null;
  let oldestKey = null;
  
  // Find oldest created item
  for (const [key, item] of cache.data.entries()) {
    if (!oldest || item.created < oldest.created) {
      oldest = item;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    cache.data.delete(oldestKey);
    cache.stats.evictions++;
    
    // Log if enabled
    if (cache.options.enableLogging) {
      logChatEvent('cache', 'Cache item evicted (FIFO)', { 
        cache: cache.name, 
        key: oldestKey 
      });
    }
  }
}

/**
 * Evict using approximate Least Frequently Used policy
 * Since we don't track access count, use lastAccess as approximation
 * @param {Object} cache - Cache object
 */
function evictLFU(cache) {
  // We don't track frequency directly, so use LRU as approximation
  evictLRU(cache);
}

/**
 * Evict using priority policy (lowest priority first)
 * @param {Object} cache - Cache object
 */
function evictByPriority(cache) {
  let lowestPriority = null;
  let lowestPriorityKey = null;
  
  // Find item with lowest priority
  for (const [key, item] of cache.data.entries()) {
    if (lowestPriority === null || item.priority < lowestPriority) {
      lowestPriority = item.priority;
      lowestPriorityKey = key;
    }
  }
  
  if (lowestPriorityKey) {
    cache.data.delete(lowestPriorityKey);
    cache.stats.evictions++;
    
    // Log if enabled
    if (cache.options.enableLogging) {
      logChatEvent('cache', 'Cache item evicted (Priority)', { 
        cache: cache.name, 
        key: lowestPriorityKey 
      });
    }
  }
}

/**
 * Cleanup expired items from the cache
 * @param {Object} cache - Cache object
 */
function cleanup(cache) {
  const now = Date.now();
  let count = 0;
  
  // Find and remove expired items
  for (const [key, item] of cache.data.entries()) {
    if (item.expiry && item.expiry < now) {
      cache.data.delete(key);
      count++;
    }
  }
  
  if (count > 0) {
    cache.stats.evictions += count;
    
    // Log if enabled
    if (cache.options.enableLogging) {
      logChatEvent('cache', 'Cache cleanup', { 
        cache: cache.name, 
        itemsRemoved: count 
      });
    }
  }
  
  cache.stats.lastCleanup = now;
}

/**
 * Destroy a cache
 * @param {string} name - Cache name
 * @returns {boolean} Success status
 */
export function destroyCache(name) {
  if (!caches[name]) return false;
  
  // Clear timer if exists
  if (caches[name].cleanupTimer) {
    clearInterval(caches[name].cleanupTimer);
  }
  
  // Clear data
  caches[name].data.clear();
  
  // Remove from caches
  delete caches[name];
  
  // Log if enabled
  if (caches[name]?.options?.enableLogging) {
    logChatEvent('cache', 'Cache destroyed', { name });
  }
  
  return true;
}

/**
 * Get all available caches
 * @returns {Array<string>} Array of cache names
 */
export function getAllCaches() {
  return Object.keys(caches);
}

/**
 * Get cache by name
 * @param {string} name - Cache name
 * @returns {Object|null} Cache API or null if not found
 */
export function getCache(name) {
  return caches[name]?.api || null;
}

/**
 * Configure cache defaults
 * @param {Object} defaults - Default cache options
 */
export function configureCacheDefaults(defaults) {
  Object.assign(DEFAULT_OPTIONS, defaults);
}

/**
 * Get combined stats for all caches
 * @returns {Object} Combined stats
 */
export function getGlobalStats() {
  const stats = {
    totalCaches: Object.keys(caches).length,
    totalItems: 0,
    totalHits: 0,
    totalMisses: 0,
    totalSets: 0,
    totalDeletes: 0,
    totalEvictions: 0,
    caches: {}
  };
  
  // Aggregate stats
  for (const name in caches) {
    const cache = caches[name];
    stats.totalItems += cache.data.size;
    stats.totalHits += cache.stats.hits;
    stats.totalMisses += cache.stats.misses;
    stats.totalSets += cache.stats.sets;
    stats.totalDeletes += cache.stats.deletes;
    stats.totalEvictions += cache.stats.evictions;
    
    stats.caches[name] = {
      size: cache.data.size,
      maxSize: cache.options.maxItems,
      ttl: cache.options.ttl,
      hits: cache.stats.hits,
      misses: cache.stats.misses
    };
  }
  
  // Calculate global hit rate
  const totalRequests = stats.totalHits + stats.totalMisses;
  stats.globalHitRate = totalRequests ? stats.totalHits / totalRequests : 0;
  
  return stats;
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  for (const name in caches) {
    clear(caches[name]);
  }
  
  logChatEvent('cache', 'All caches cleared');
}

export default {
  createCache,
  destroyCache,
  getAllCaches,
  getCache,
  configureCacheDefaults,
  getGlobalStats,
  clearAllCaches
};