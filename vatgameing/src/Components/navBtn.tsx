import "./styles/navBtn.css"
import { Link} from "react-router";

interface NavBtnProps {
    to: string;
    label: string;
    active: boolean;
    click: () => void;
}

function Navbtn({ to, label, active, click }: NavBtnProps) {
    return (
      <Link to={`${to}`} className="nav-btn" onClick={click}>
        <div className={`menu-nav-button ${active ? 'active' : ''}`}>
          <span className="nav-text">{label}</span>
          <span className="nav-hover-line"></span>
        </div>
      </Link>
    );
}

export default Navbtn