import { Box, Typography } from '@mui/material';
import { Favorite } from '@mui/icons-material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 3,
        px: 2,
        textAlign: 'center',
        backgroundColor: 'background.default',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        Crafted with
        <Favorite
          sx={{
            fontSize: 16,
            color: 'error.main',
            '&:hover': { animation: 'pulse 1s ease-in-out infinite' },
          }}
        />
        and a lot of AI. Powered by Gemini 3 + Veo 3.1
      </Typography>
    </Box>
  );
}
