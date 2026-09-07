import { useEffect, useState } from "react";
import { FaSearch, FaPhone } from "react-icons/fa";
import { apiRequest } from "../../api";
import { useAuth } from "../../context/AuthContext";
import StatusBadge from "../StatusBadge";

function ViewOrderList({ onOpenOrder }) {
  const { agent } = useAuth();

  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", status: "All", bookedBy: "All" });
  const [agents, setAgents] = useState([]);
  const [result, setResult] = useState({ orders: [], totalPages: 1, totalRecords: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiRequest("/agents").then(setAgents).catch(() => setAgents([]));
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "10",
      status: filters.status,
      bookedBy: filters.bookedBy,
    });
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    apiRequest(`/orders?${params.toString()}`)
      .then(setResult)
      .catch(() => setResult({ orders: [], totalPages: 1, totalRecords: 0, page: 1 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  return (
    <section className="order-panel">
      <div className="panel-title">
        <span>Order List</span>
      </div>

      <div className="order-filters">
        <div>
          <label>Order Date</label>
          <div className="date-range">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
            <span>To Date</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label>Order Status</label>
          <div className="status-buttons">
            {["All", "New Order", "Pending", "Completed"].map((status) => (
              <button
                key={status}
                className={filters.status === status ? "selected" : ""}
                onClick={() => setFilters((f) => ({ ...f, status }))}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label>Order Booked By</label>
          <select
            value={filters.bookedBy}
            onChange={(e) => setFilters((f) => ({ ...f, bookedBy: e.target.value }))}
          >
            <option value="All">All</option>
            <option value={agent?.id}>Me</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </div>

        <button className="search-orders" onClick={handleSearch}>
          <FaSearch /> Search
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Order Booked By</th>
              <th>Item</th>
              <th>Booking Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8}>Loading...</td>
              </tr>
            )}

            {!loading && result.orders.length === 0 && (
              <tr>
                <td colSpan={8}>No orders found.</td>
              </tr>
            )}

            {!loading &&
              result.orders.map((order, index) => (
                <tr key={order.id}>
                  <td>{(page - 1) * 10 + index + 1}</td>
                  <td>
                    <button className="order-id" onClick={() => onOpenOrder(order.id)}>
                      {order.orderNumber}
                    </button>
                  </td>
                  <td>
                    {order.customerName}
                    <button className="mini-call" title={order.customerMobile}>
                      <FaPhone />
                    </button>
                  </td>
                  <td>{order.bookedByName}</td>
                  <td>{order.itemTitle}</td>
                  <td>{order.createdAt}</td>
                  <td>&#8377;{Number(order.grandTotal).toLocaleString("en-IN")}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span>
          Page {result.page} of {result.totalPages} &nbsp;&nbsp; Total Records: {result.totalRecords}
        </span>
        <button disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}

export default ViewOrderList;
