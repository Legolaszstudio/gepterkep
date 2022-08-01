import "./NotFound.css";

function NotFound() {
    document.title = "404 - Gép Térkép"
    
    return (
        <div className="notfound">
            <h1>Hibába ütköztünk, ez az oldal nem található</h1>
        </div>
    );
}

export default NotFound;