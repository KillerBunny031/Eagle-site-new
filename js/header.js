let burger_menu = () => {
    const menu = document.getElementById("burger_menu");
    const menu_wrapper = document.getElementById("burger_wrapper");
    if (menu.style.display == "flex") {
        menu.style.display = "none"
        menu_wrapper.style.display = "none"
    }
    else {
        menu.style.display = "flex"
        menu_wrapper.style.display = "flex"
    }
}