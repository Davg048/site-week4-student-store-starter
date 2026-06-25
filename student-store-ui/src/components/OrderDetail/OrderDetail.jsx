import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { formatPrice, formatDate } from "../../utils/format";
import "./OrderDetail.css";

const API_BASE_URL = "http://localhost:3001";

// Detail page for a single order: shows each line item (name, quantity, unit
// price, line cost) and the order total. Fetches GET /orders/:id, which the
// backend returns with its orderItems (and each item's product) nested in.
function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
        setOrder(response.data);
      } catch (err) {
        setError("Order not found.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (isFetching) return <div className="OrderDetail"><p>Loading...</p></div>;
  if (error) return <div className="OrderDetail"><p className="error">{error}</p><Link to="/orders">← Back to orders</Link></div>;
  if (!order) return null;

  return (
    <div className="OrderDetail">
      <Link to="/orders" className="back-link">← Back to all orders</Link>

      <h1>Order #{order.id}</h1>
      <div className="order-meta">
        <span>Date: {formatDate(order.createdAt)}</span>
        <span>Email: {order.email || "—"}</span>
        <span>Status: <span className={`status ${order.status}`}>{order.status}</span></span>
      </div>

      <table className="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {order.orderItems.map((item) => (
            <tr key={item.id}>
              <td>{item.product?.name || `Product #${item.productId}`}</td>
              <td>{item.quantity}</td>
              <td>{formatPrice(item.price)}</td>
              <td>{formatPrice(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="order-total">
        <span>Total</span>
        <span>{formatPrice(order.totalPrice)}</span>
      </div>
    </div>
  );
}

export default OrderDetail;
