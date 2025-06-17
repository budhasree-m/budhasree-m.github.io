"use strict";

const mode = document.querySelector(".mode");

mode.addEventListener("click", function(event){
  document.body.classList.toggle("dark");
  if(mode.id === "dark"){
    mode.setAttribute("id", "light");
    mode.setAttribute("class", "fa-regular fa-sun mode");
  }else{
    mode.setAttribute("id", "dark");
    mode.setAttribute("class", "fa-regular fa-moon mode");
  }
})

document.getElementById('contactForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission

    const form = event.target;
    const formData = new FormData(form); // Get all form data

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData, // Use FormData for easy submission
            // headers: { // Headers might be needed for specific API calls, but FormData handles content-type for this endpoint
            //     'Accept': 'application/json'
            // }
        });

        const result = await response.json(); // Web3Forms typically returns JSON

        if (result.success) {
            window.location.href = '/contact.html';
            form.reset(); // Clear the form
        } else {
            alert(`Error: ${result.message || 'Something went wrong.'}`);
            console.error('Web3Forms error:', result);
        }
    } catch (error) {
        alert('Network error. Please try again later.');
        console.error('Fetch error:', error);
    }
});

// --------------------------------------------------------------------------------------------------------------------

const hamburger_icon = document.querySelector('.hamburger-menu-icon');
const item = document.querySelector('.item');

hamburger_icon.addEventListener('click', function(event){
  item.classList.toggle('active');

  item.querySelectorAll('a').forEach(function(link){
    link.addEventListener('click', () => {
      if(item.classList.contains('active')){
        item.classList.remove('active');
      }
    });
  });
})