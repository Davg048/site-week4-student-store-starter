import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { formatPrice, formatDate } from "../../utils/format";
import "./PastOrders.css";

const API_BASE_URL = "http://localhost:3001";

// Past Orders page: lists every order, with an input to filter by the email
// the order was placed with. Each row links to that order's detail page.
function PastOrders() {
  const [orders, setOrders] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [activeEmail, setActiveEmail] = useState(""); // the email currently filtering
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  // Fetch orders. If an email is passed, ask the API to filter by it.
  const fetchOrders = async (email) => {
    setIsFetching(true);
    setError(null);
    try {
      const url = email
        ? `${API_BASE_URL}/orders?email=${encodeURIComponent(email)}`
        : `${API_BASE_URL}/orders`;
      const response = await axios.get(url);
      setOrders(response.data);
    } catch (err) {
      setError("Failed to load orders.");
    } finally {
      setIsFetching(false);
    }
  };

  // Load all orders on first render.
  useEffect(() => {
    fetchOrders();
  }, []);

  const handleFilter = (event) => {
    event.preventDefault(); // stop the form from reloading the page
    setActiveEmail(emailInput);
    fetchOrders(emailInput);
  };

  const handleClear = () => {
    setEmailInput("");
    setActiveEmail("");
    fetchOrders();
  };

  return (
    <div className="PastOrders">
      <h1>Past Orders</h1>

      <form className="filter-bar" onSubmit={handleFilter}>
        <input
          type="email"
          placeholder="Filter by email..."
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
        />
        <button type="submit">Filter</button>
        {activeEmail && (
          <button type="button" className="clear" onClick={handleClear}>
            Show all
          </button>
        )}
      </form>

      {activeEmail && (
        <p className="filter-note">Showing orders for: <strong>{activeEmail}</strong></p>
      )}

      {error && <p className="error">{error}</p>}
      {isFetching && <p>Loading...</p>}

      {!isFetching && orders.length === 0 ? (
        <p className="empty">No orders found.</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Email</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><Link to={`/orders/${order.id}`}>#{order.id}</Link></td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.email || "—"}</td>
                <td>{formatPrice(order.totalPrice)}</td>
                <td><span className={`status ${order.status}`}>{order.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PastOrders;
