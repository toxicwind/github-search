
const path = require('path');
const originalConfig = {};

module.exports = {
  ...originalConfig,
  webpack: (config, options) => {
    // Call original webpack function if it exists
    if (originalConfig.webpack) {
      config = originalConfig.webpack(config, options);
    }
    
    // Add stats generation
    if (!options.dev && !options.isServer) {
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.done.tap('VibeAliveStatsPlugin', (stats) => {
            const statsJson = stats.toJson({ all: true });
            require('fs').writeFileSync('/home/toxic/development/github-advanced-search-mcp/crates/frontend/vibealive-stats.json', JSON.stringify(statsJson, null, 2));
          });
        }
      });
    }
    
    return config;
  }
};
