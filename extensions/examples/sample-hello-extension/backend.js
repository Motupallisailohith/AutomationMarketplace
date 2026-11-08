// Backend extension for Hello World
// This demonstrates how to create backend logic for an extension

module.exports = {
  setup: function(context) {
    console.log('Hello World Extension - Backend initialized!');
    console.log('Backend context:', context);
    
    // You can add event listeners, API endpoints, or other backend logic here
    // Example: Listen to workflow events
    // context.on('workflow.executed', (event) => {
    //   console.log('Workflow executed:', event);
    // });
  }
};
