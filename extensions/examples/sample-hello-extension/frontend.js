// Frontend extension for Hello World
// This demonstrates how to create frontend components for an extension

module.exports = {
  setup: function(context) {
    console.log('Hello World Extension - Frontend initialized!');
    console.log('Frontend context:', context);
    
    // Example: Register a custom component
    // context.registerComponent('HelloButton', {
    //   template: '<button @click="sayHello">Hello from Extension!</button>',
    //   methods: {
    //     sayHello() {
    //       alert('Hello from extension!');
    //     }
    //   }
    // });
    
    // Example: Add a custom route
    // context.defineRoutes([
    //   {
    //     path: '/extension-hello',
    //     name: 'ExtensionHello',
    //     component: () => import('./HelloPage.vue')
    //   }
    // ]);
  }
};
