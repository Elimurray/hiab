import cartersLogo from "../assets/Carters_Horizontal_transparent.png";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <img src={cartersLogo} alt="Carter's" className="footer-logo" />
      <span className="footer-text">
        HIAB Lift Planner &mdash; Carter's &copy; {new Date().getFullYear()}
      </span>
    </footer>
  );
}
