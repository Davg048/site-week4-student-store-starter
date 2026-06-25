import { useNavigate } from "react-router-dom"
import "./SubNavbar.css"

function SubNavbar({ activeCategory, setActiveCategory, searchInputValue, handleOnSearchInputChange }) {

  // Lets us programmatically change the URL (e.g. send the user back to the home page).
  const navigate = useNavigate();

  const categories = ["All Categories", "Accessories", "Apparel", "Books", "Snacks", "Supplies"];

  // Selecting a category should also return the user to the home page so the
  // filtered product grid is visible (the filter only applies on route "/").
  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    navigate("/");
  };

  return (
    <nav className="SubNavbar">

      <div className="content">

        <div className="row">
          <div className="search-bar">
            <input
              type="text"
              name="search"
              placeholder="Search"
              value={searchInputValue}
              onChange={handleOnSearchInputChange}
            />
            <i className="material-icons">search</i>
          </div>
        </div>

        <div className="row">
          <ul className={`category-menu`}>
            {categories.map((cat) => (
              <li className={activeCategory === cat ? "is-active" : ""} key={cat}>
                <button onClick={() => handleCategoryClick(cat)}>{cat}</button>
              </li>
            ))}
          </ul>
        </div>
        
      </div>
    </nav>
  )
}

export default SubNavbar;