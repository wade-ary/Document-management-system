const newSteps = [
    {
      id: "step-1",
      text: "Welcome to EDU DATA! This is where you can manage your documents efficiently.",
      attachTo: { element: ".navbar", on: "bottom" },
      buttons: [
        {
          text: "Next",
          action: () => {
            // Proceed to the next step
          },
        },
      ],
    },
    {
      id: "step-2",
      text: "Here is the dashboard where you can view document stats.",
      attachTo: { element: ".dashboard-section", on: "right" },
      buttons: [
        {
          text: "Back",
          action: () => {
            // Go to the previous step
          },
        },
        {
          text: "Next",
          action: () => {
            // Proceed to the next step
          },
        },
      ],
    },
  ];
  
  export default newSteps;
  