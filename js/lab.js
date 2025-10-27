const inputbtn = () => {
    prompt('Введи че-нибудь');
};

const button_input = document.querySelector('#promptbtn');

button_input.addEventListener('click', inputbtn);




const outputbtn = () => {
    alert("Сам выведу");
};

const button_output = document.querySelector('#alertbtn');

button_output.addEventListener('click', outputbtn);


