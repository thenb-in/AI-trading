function UnauthorisedTable() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">You are not authorized to view this table</p>
      </div>
    </div>
  )
}

export { UnauthorisedTable };
