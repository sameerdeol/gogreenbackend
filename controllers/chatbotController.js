const vendorFAQ = [
    { id: 1, q: 'How to add a product?', a: 'Go to dashboard > Add Product.' },
    { id: 2, q: 'How to manage orders?', a: 'Use the Orders tab to view and manage orders.' },
    { id: 3, q: 'How to track payments?', a: 'Payout details are under Wallet > Payouts.' },
  ];
  
  const deliveryFAQ = [
    { id: 1, q: 'How to accept an order?', a: 'Go to Active Orders > Tap on Accept.' },
    { id: 2, q: 'How to contact the customer?', a: 'You can call the customer via the order page.' },
    { id: 3, q: 'What if I have a delay?', a: 'Report delay via the Delay button in app.' },
  ];
  
  const handleChat = (req, res) => {
    const { message, state, role_id } = req.body;
  
    // Use role_id 3 for vendor and 4 for delivery_partner
    let faq = [];
    if (role_id === 3) {
      faq = vendorFAQ;
    } else if (role_id === 4) {
      faq = deliveryFAQ;
    } else {
      return res.json({
        reply: '❌ Sorry, your role is not recognized. Please try again.',
        nextState: 'menu'
      });
    }
  
    // If the state is menu or empty, show the list of questions
    if (!state || state === 'menu') {
      const menu = faq.map(f => `${f.id}. ${f.q}`).join('\n');
      return res.json({
        reply: `👋 Hello! Choose a question:\n${menu}`,
        nextState: 'awaitingAnswer'
      });
    }
  
    // If waiting for an answer, handle user input
    if (state === 'awaitingAnswer') {
      const index = parseInt(message);
      const answer = faq.find(f => f.id === index);
  
      if (answer) {
        const menu = faq.map(f => `${f.id}. ${f.q}`).join('\n');
        return res.json({
          reply: `👉 ${answer.a}\n\n🔁 Anything else?\n${menu}`,
          nextState: 'awaitingAnswer'
        });
      } else {
        return res.json({
          reply: '❌ Invalid option. Please enter a number from the list.',
          nextState: 'awaitingAnswer'
        });
      }
    }
  
    return res.json({
      reply: "🤖 I'm not sure how to help. Let's start over.",
      nextState: 'menu'
    });
  };
  
  module.exports = { handleChat };