module.exports = (sequelize, DataTypes) => {
  const OnboardingOrder = sequelize.define(
    'OnboardingOrder',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      razorpay_order_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'INR'
      },
      status: {
        type: DataTypes.ENUM('created', 'paid', 'provisioned', 'refunded', 'failed'),
        allowNull: false,
        defaultValue: 'created'
      },
      razorpay_payment_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      razorpay_refund_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      tableName: 'nbnext_onboarding_orders',
      underscored: true,
      indexes: [{ fields: ['status'] }]
    }
  );

  return OnboardingOrder;
};
