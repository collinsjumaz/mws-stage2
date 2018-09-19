(function() {
  'use strict';
    const filesToCache = [
      '/',
      'css/styles.css',
      'js/dbhelper.js',
      'js/main.js',
      'js/restaurant_info.js',
      'img/1.jpg',
      'img/2.jpg',
      'img/3.jpg',
      'img/4.jpg',
      'img/5.jpg',
      'img/6.jpg',
      'img/7.jpg',
      'img/8.jpg',
      'img/9.jpg',
      'img/10.jpg',
      'img/off.png',
      'index.html',
      // 'restaurant.html', //no need to cache
      // it is later cached in fetch event
    ];

    const staticCacheName = 'restaurant';

    self.addEventListener('install', function(event) {
      console.log('Install service worker and caching static assets');
      event.waitUntil(
        caches.open(staticCacheName)
        .then(function(cache) {
          return cache.addAll(filesToCache);
        })
      );
    });

    self.addEventListener('fetch', function(event) {
      let requestUrl = new URL(event.request.url);
      if (requestUrl.origin === location.origin) {
        // since right now we are serving single html page, for any requests
        // we'll be caching restaurant.html page only once
        if (requestUrl.pathname.startsWith('/restaurant.html')) {
          event.respondWith(serveRestaurantHTML(event.request));
          return;
        };
        // Don't cache PUT/POST requests
        if (event.request.method !== 'GET') return;
        event.respondWith(
          caches.match(event.request).then(function(response) {
            if (response) {
              return response;
            }
            return fetch(event.request).then(function(response) {
              if (response.status === 404) {
                
                return caches.match('');
              }
              return caches.open(staticCacheName).then(function(cache) {
                cache.put(event.request.url, response.clone());
                return response;
              });
            });
          }).catch(function(error) {
            // If fetch cannot reach the network, it throws an error and sends it
            // to .catch.
            return caches.match('');
          })
        );
      };
    });

    //  delete unused caches
    self.addEventListener('activate', function(event) {
      console.log('Activating new service worker...');

      let cacheWhitelist = [staticCacheName];

      event.waitUntil(
        caches.keys().then(function(cacheNames) {
          return Promise.all(
            cacheNames.map(function(cacheName) {
              if (cacheWhitelist.indexOf(cacheName) === -1) {
                return caches.delete(cacheName);
              }
            })
          );
        })
      );
    });

    self.addEventListener('sync', function(event) {
      console.log(`Connectivity is stable again :) Let's put data online `);
      if (event.tag == 'reviewSync') {
        console.log('sync event fired for reviews that user added while offline');
        event.waitUntil(sendMessageToClient({message: 'post-offline-reviews-to-server'}));
      }
    });
  
    function sendMessageToClient(message) {
        // Send a message to the client.
        self.clients.matchAll().then(function(clients) {
          clients.forEach(function(client) {
            client.postMessage(message);
          });
        });
    }

    // serves restaurants.html page
    function serveRestaurantHTML(request) {
      console.log(request);
      // Use this url to store & match retaurants.hmtl in the cache.
      const storageUrl = request.url.split('?')[0];

      return caches.open(staticCacheName).then(function(cache) {
         return cache.match(storageUrl).then(function(response) {
           if (response) return response;

           return fetch(request).then(function(networkResponse) {
             cache.put(storageUrl, networkResponse.clone());
             return networkResponse;
           });
         });
       });
    }
})();
