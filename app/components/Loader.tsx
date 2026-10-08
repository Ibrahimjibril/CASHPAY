export default function Loader() {
  return (
    <div className="cp-loader" role="status" aria-label="Loading">
      <img src="/logo.svg" alt="CashPay" className="cp-spin" width={76} height={76} />
    </div>
  );
}
