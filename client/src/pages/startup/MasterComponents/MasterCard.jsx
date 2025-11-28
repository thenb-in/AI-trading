
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Fade,
} from "@mui/material";

const MasterCard = ({
  title,
  description,
  icon: Icon,
  color = "primary",
  onClick,
  buttonText,
  tags = [],
  isVisible = true,
  fullWidth = false,
}) => {
  if (!isVisible) return null;

  return (
    <Fade in={isVisible} timeout={300}>
      <Card
        elevation={4}
        sx={{
          width: fullWidth ? "100%" : "auto",
          minWidth: 350,
          maxWidth: 450,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.3s ease-in-out",
          cursor: "pointer",
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: 8,
            "& .card-icon": {
              transform: "scale(1.1) rotate(5deg)",
            },
            "& .card-overlay": {
              opacity: 0.05,
            },
          },
        }}
        onClick={onClick}
      >
        <Box
          className="card-overlay"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, transparent 0%, ${
              color === "primary"
                ? "#1976d2"
                : color === "secondary"
                ? "#9c27b0"
                : "#ed6c02"
            }22 100%)`,
            opacity: 0,
            transition: "opacity 0.3s ease-in-out",
            zIndex: 0,
          }}
        />
        <CardContent
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            p: 4,
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            className="card-icon"
            sx={{
              bgcolor: `${color}.main`,
              color: `${color}.contrastText`,
              p: 2.5,
              borderRadius: "20px",
              width: 80,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              transition: "transform 0.3s ease-in-out",
              boxShadow: 4,
              "& svg": {
                fontSize: "2.5rem",
              },
            }}
          >
            <Icon />
          </Box>
          <Typography
            variant="h5"
            component="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "text.primary",
              mb: 2,
              letterSpacing: "-0.5px",
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 3,
              lineHeight: 1.6,
              flexGrow: 1,
              fontWeight: 400,
            }}
          >
            {description}
          </Typography>
          {tags.length > 0 && (
            <Box
              sx={{
                mb: 3,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                justifyContent: "center",
              }}
            >
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: "0.75rem",
                    height: 24,
                    borderColor: `${color}.main`,
                    color: `${color}.main`,
                    "&:hover": {
                      bgcolor: `${color}.main`,
                      color: `${color}.contrastText`,
                    },
                  }}
                />
              ))}
            </Box>
          )}
          <Button
            variant="contained"
            color={color}
            size="large"
            sx={{
              alignSelf: "center",
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: 3,
              textTransform: "none",
              minWidth: 200,
              boxShadow: 3,
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-2px)",
              },
            }}
          >
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    </Fade>
  );
};

MasterCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  buttonText: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string),
  isVisible: PropTypes.bool,
  fullWidth: PropTypes.bool,
};

export { MasterCard };
