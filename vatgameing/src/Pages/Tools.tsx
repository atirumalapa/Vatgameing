import "./styles/Tools.css"
import NavBar from "../Components/navBar";
import Navbtn from "../Components/navBtn";
import { useLocation } from "react-router";


function Tools() {
    const location = useLocation();
    return (
        <>
            <NavBar/>
            <h1>Tools</h1>
            <Navbtn
              key={"/games"}
              to={"/tools/games"}
              label={"Games"}
              active={location.pathname === "/games"}
              click={()=>  <h1></h1>}
            />

        </>
    );
}

export default Tools