import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Grid,
  Box,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
  Collapse,
  FormControl,
  Select,
  MenuItem,
  Switch,
  CircularProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  ArrowForward,
  EmojiEvents,
  CheckCircle,
  Refresh,
  ExpandMore,
  ExpandLess,
  ChevronLeft,
  ChevronRight,
  SettingsInputSvr,
  MovieFilter,
  OfflineBolt,
} from '@mui/icons-material';
import QCBadge from '../qc/QCBadge';
import QCDetailPanel from '../qc/QCDetailPanel';
import type { VideoResult, VideoGenerateOptions } from '../../types';
import { usePipelineStore } from '../../store/pipelineStore';
import {
  VEO_MODELS,
  DEFAULT_NUM_VIDEO_VARIANTS,
  DEFAULT_VIDEO_QC_THRESHOLD,
  DEFAULT_MAX_VIDEO_QC_REGEN,
} from '../../constants/controls';
import ModelBadge from '../common/ModelBadge';

interface VideoPlayerProps {
  results: VideoResult[];
  onContinue: () => void;
  onGenerate: (options?: VideoGenerateOptions) => void;
  onSelectVariant?: (sceneNumber: number, variantIndex: number) => void;
  onRegenScene?: (sceneNumber: number, options?: VideoGenerateOptions) => Promise<void>;
  isLoading: boolean;
  readOnly?: boolean;
  totalScenes?: number;
}

function getOverallScore(report: NonNullable<import('../../types').VideoQCReport>): number {
  const dims = [
    report.technical_distortion,
    report.cinematic_imperfections,
    report.avatar_consistency,
    report.product_consistency,
    report.temporal_coherence,
    report.hand_body_integrity,
    report.brand_text_accuracy,
  ];
  const scores = dims.filter((d) => d != null).map((d) => d.score);
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

function buildOptions(controls: {
  veoModel: string;
  aspectRatio: string;
  duration: string;
  resolution: string;
  numVariants: number;
  compression: string;
  useReferenceImages: boolean;
  qcThreshold: number;
  maxQcRegen: number;
  negativePrompt: string;
  seed: string;
  generateAudio: boolean;
}): VideoGenerateOptions {
  const opts: VideoGenerateOptions = {
    aspect_ratio: controls.aspectRatio,
    duration_seconds: Number(controls.duration),
    resolution: controls.resolution,
    num_variants: controls.numVariants,
    compression_quality: controls.compression,
    use_reference_images: controls.useReferenceImages,
    qc_threshold: controls.qcThreshold,
    max_qc_regen_attempts: controls.maxQcRegen,
    generate_audio: controls.generateAudio,
  };
  if (controls.veoModel) {
    opts.veo_model = controls.veoModel;
  }
  if (controls.negativePrompt.trim()) {
    opts.negative_prompt_extra = controls.negativePrompt.trim();
  }
  if (controls.seed.trim()) {
    const parsed = Number(controls.seed.trim());
    if (!Number.isNaN(parsed)) {
      opts.seed = parsed;
    }
  }
  return opts;
}

export default function VideoPlayer({
  results,
  onContinue,
  onGenerate,
  onSelectVariant,
  onRegenScene,
  isLoading,
  readOnly = false,
  totalScenes,
}: VideoPlayerProps) {
  const aspectRatio = usePipelineStore((s) => s.aspectRatio);
  const [veoModel, setVeoModel] = useState('veo-3.1-generate-preview');
  const [duration, setDuration] = useState('8');
  const storeResolution = usePipelineStore((s) => s.veoResolution);
  const [resolution, setResolutionLocal] = useState(storeResolution);
  const setResolution = (v: string) => {
    setResolutionLocal(v);
    usePipelineStore.getState().setVeoResolution(v);
  };
  const [numVariants, setNumVariants] = useState(DEFAULT_NUM_VIDEO_VARIANTS);
  const [compression, setCompression] = useState('optimized');
  const [useReferenceImages, setUseReferenceImages] = useState(true);
  const [qcThreshold, setQcThreshold] = useState(DEFAULT_VIDEO_QC_THRESHOLD);
  const [maxQcRegen, setMaxQcRegen] = useState(DEFAULT_MAX_VIDEO_QC_REGEN);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31).toString());
  const [generateAudio, setGenerateAudio] = useState(true);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});
  const [expandedQcContext, setExpandedQcContext] = useState<Record<number, boolean>>({});
  const [regenLoading, setRegenLoading] = useState<Record<number, boolean>>({});

  const requires8s = useReferenceImages || resolution === '1080p' || resolution === '4K';

  useEffect(() => {
    if (requires8s && duration !== '8') {
      setDuration('8');
    }
  }, [requires8s, duration]);

  const controlValues = {
    veoModel,
    aspectRatio,
    duration,
    resolution,
    numVariants,
    compression,
    useReferenceImages,
    qcThreshold,
    maxQcRegen,
    negativePrompt,
    seed,
    generateAudio,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 4 }}>
      {/* Premium Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '12px', bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: '0 0 16px rgba(100, 108, 255, 0.4)' }}>
            <MovieFilter />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              Cinematic Compositor
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Ken Burns Panning & Zoom Engine
            </Typography>
          </Box>
        </Box>
        {onSelectVariant && !readOnly && results.length > 0 && (
          <Paper elevation={0} sx={{ py: 0.8, px: 2, borderRadius: '8px', border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 13 }}>
              Select a variant below to set the scene cut
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Modern Developer Dashboard Configuration Panel */}
      {!readOnly && (
        <Paper
          elevation={0}
          sx={{
            mb: 5,
            p: { xs: 2.5, md: 4 },
            backgroundColor: 'background.paper',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.015), rgba(255,255,255,0.015))',
            borderRadius: '24px',
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bg: 'primary.main', backgroundImage: 'linear-gradient(to bottom, #6366f1, #3b82f6)' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsInputSvr sx={{ color: 'primary.main', fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.primary', fontSize: 12 }}>
                Render Pipeline Settings
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Column 1: Model & Duration */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                      Veo Model Core
                    </Typography>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={veoModel}
                        onChange={(e: SelectChangeEvent) => setVeoModel(e.target.value)}
                        sx={{
                          borderRadius: '12px',
                          bgcolor: 'rgba(255,255,255,0.01)',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
                        }}
                      >
                        {VEO_MODELS.map((m) => (
                          <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13 }}>
                            {m.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                      Clip Duration
                    </Typography>
                    <ToggleButtonGroup
                      value={duration}
                      exclusive
                      onChange={(_, v) => { if (v) setDuration(v); }}
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiToggleButton-root': {
                          borderRadius: '10px',
                          py: 0.8,
                          fontWeight: 600,
                          fontSize: 13,
                          textTransform: 'none',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            boxShadow: '0 0 12px rgba(100, 108, 255, 0.25)',
                          }
                        }
                      }}
                    >
                      <ToggleButton value="4" disabled={requires8s}>4s</ToggleButton>
                      <ToggleButton value="6" disabled={requires8s}>6s</ToggleButton>
                      <ToggleButton value="8">8s</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>
              </Grid>

              {/* Column 2: Resolution & Variants */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                      Target Resolution
                    </Typography>
                    <ToggleButtonGroup
                      value={resolution}
                      exclusive
                      onChange={(_, v) => { if (v) setResolution(v); }}
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiToggleButton-root': {
                          borderRadius: '10px',
                          py: 0.8,
                          fontWeight: 600,
                          fontSize: 13,
                          textTransform: 'none',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            boxShadow: '0 0 12px rgba(100, 108, 255, 0.25)',
                          }
                        }
                      }}
                    >
                      <ToggleButton value="720p">720p</ToggleButton>
                      <ToggleButton value="1080p">1080p</ToggleButton>
                      <ToggleButton value="4K">4K</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                      Variants: {numVariants} options
                    </Typography>
                    <Slider
                      value={numVariants}
                      onChange={(_, v) => setNumVariants(v as number)}
                      min={1}
                      max={4}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      size="medium"
                      sx={{
                        color: 'primary.main',
                        '& .MuiSlider-thumb': {
                          boxShadow: '0 0 8px rgba(100, 108, 255, 0.4)',
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Column 3: Advanced toggles */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                      Audio Synthesis
                    </Typography>
                    <Box sx={{ p: 1.2, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.005)' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={generateAudio}
                            onChange={(e) => setGenerateAudio(e.target.checked)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                            Generate Silent Audio Track
                          </Typography>
                        }
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                      Consistency & Continuity
                    </Typography>
                    <Box sx={{ p: 1.2, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.005)' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={useReferenceImages}
                            onChange={(e) => setUseReferenceImages(e.target.checked)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                            Use Reference Assets
                          </Typography>
                        }
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Constraint Alerts */}
            {requires8s && (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: '12px', borderColor: 'primary.main', bgcolor: 'rgba(100, 108, 255, 0.03)', color: 'text.primary' }}>
                Clip duration auto-locked to 8 seconds to satisfy reference asset requirements or ultra-high resolution.
              </Alert>
            )}

            {/* Generate Action Button */}
            <Button
              variant="contained"
              fullWidth
              onClick={() => onGenerate(buildOptions(controlValues))}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <OfflineBolt />}
              sx={{
                py: 1.8,
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '0.02em',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                boxShadow: '0 6px 20px rgba(100, 108, 255, 0.35)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 25px rgba(100, 108, 255, 0.5)',
                },
                '&:disabled': {
                  background: 'action.disabledBackground',
                }
              }}
            >
              {isLoading ? 'Processing Scene Synthesis...' : 'Compile Video Assets'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Empty State */}
      {results.length === 0 && !isLoading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: '24px',
            bgcolor: 'rgba(255,255,255,0.005)',
            mb: 4,
          }}
        >
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Configure render properties above and click Compile Video Assets
          </Typography>
        </Box>
      )}

      {/* Full Skeleton Loading */}
      {isLoading && results.length === 0 && (
        <Box sx={{ mb: 5 }}>
          {Array.from({ length: totalScenes || 3 }).map((_, n) => (
            <Box key={`skeleton-scene-${n}`} sx={{ mb: 5 }}>
              <Skeleton variant="text" width={160} height={40} sx={{ mb: 2, borderRadius: '4px' }} />
              <Grid container spacing={3}>
                {[0, 1, 2, 3].map((i) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '16px' }} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      {/* Scene Results Sections */}
      {results.map((sceneResult) => (
        <Accordion
          key={sceneResult.scene_number}
          defaultExpanded
          sx={{
            mb: 4,
            borderRadius: '24px !important',
            '&:before': { display: 'none' },
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
          elevation={0}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              bgcolor: 'action.hover',
              borderBottom: '1px solid',
              borderColor: 'divider',
              px: { xs: 2.5, md: 4 },
              py: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                Scene {sceneResult.scene_number} Output
              </Typography>
              {(sceneResult.regen_attempts ?? 0) > 0 && (
                <Chip
                  label={`${sceneResult.regen_attempts} Autoregen Loop`}
                  size="small"
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    px: 0.5,
                  }}
                />
              )}
              {sceneResult.qc_rewrite_context && (
                <Chip
                  label="QC-Refined Prompt"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}
                />
              )}
              {onRegenScene && !readOnly && (
                <Tooltip title={regenLoading[sceneResult.scene_number] ? 'Re-synthesizing Scene...' : 'Manual QC-informed re-render of this scene'}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={!!regenLoading[sceneResult.scene_number]}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setRegenLoading((prev) => ({ ...prev, [sceneResult.scene_number]: true }));
                        try {
                          await onRegenScene(sceneResult.scene_number, buildOptions(controlValues));
                        } finally {
                          setRegenLoading((prev) => ({ ...prev, [sceneResult.scene_number]: false }));
                        }
                      }}
                      sx={{ ml: 1, color: 'text.secondary', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      {regenLoading[sceneResult.scene_number] ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.paper' }}>
            {/* Carousel with custom headroom style navigation buttons */}
            <Box sx={{ position: 'relative', mx: { xs: -1, md: -2 }, px: { xs: 1, md: 2 } }}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById(`carousel-${sceneResult.scene_number}`);
                  if (el) el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' });
                }}
                sx={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  bgcolor: 'background.paper',
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.03), rgba(255,255,255,0.03))',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.primary',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-50%) scale(1.05)' },
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft />
              </IconButton>

              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById(`carousel-${sceneResult.scene_number}`);
                  if (el) el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
                }}
                sx={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  bgcolor: 'background.paper',
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.03), rgba(255,255,255,0.03))',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.primary',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-50%) scale(1.05)' },
                  transition: 'all 0.2s',
                }}
              >
                <ChevronRight />
              </IconButton>

              <Box
                id={`carousel-${sceneResult.scene_number}`}
                sx={{
                  display: 'flex',
                  gap: 3,
                  overflowX: 'auto',
                  pb: 3,
                  pt: 1,
                  scrollSnapType: 'x mandatory',
                  scrollBehavior: 'smooth',
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {sceneResult.variants.map((variant) => {
                  const isSelected = variant.index === sceneResult.selected_index;
                  const cardContent = (
                    <>
                      {isSelected && (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: 14, color: 'primary.contrastText !important' }} />}
                          label="ACTIVE Scene Cut"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 10,
                            fontWeight: 800,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                            color: 'primary.contrastText',
                            boxShadow: '0 4px 12px rgba(100, 108, 255, 0.4)',
                            px: 1,
                          }}
                        />
                      )}
                      {/* Video Player Display Container */}
                      <Box
                        sx={{
                          position: 'relative',
                          bgcolor: 'black',
                          display: 'flex',
                          justifyContent: 'center',
                          width: '100%',
                          borderTopLeftRadius: '15px',
                          borderTopRightRadius: '15px',
                          overflow: 'hidden',
                        }}
                        onClickCapture={(e) => e.stopPropagation()}
                      >
                        <video
                          src={variant.video_path}
                          controls
                          style={{
                            height: 340,
                            width: '100%',
                            maxWidth: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      </Box>

                      {/* Video Card Content */}
                      <CardContent sx={{ p: 3, bgcolor: 'background.paper', borderBottomLeftRadius: '15px', borderBottomRightRadius: '15px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '0.01em', fontSize: 14 }}>
                            Motion Option {variant.index + 1}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            FFmpeg Ken Burns {variant.index === 0 ? 'Zoom Center' : variant.index === 1 ? 'Pan Left' : variant.index === 2 ? 'Pan Right' : 'Subtle Zoom'}
                          </Typography>
                        </Box>

                        {/* QC dimensions mapped to compiler-style high-tech stats cards */}
                        {variant.qc_report && (
                          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.01)' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13, color: 'text.secondary' }}>
                                LLM Guard Evaluation
                              </Typography>
                              {/* Scale overall score * 10 so it maps cleanly to standard out of 100 on QCBadge */}
                              <QCBadge
                                score={getOverallScore(variant.qc_report) * 10}
                                label="Index Score"
                              />
                            </Box>

                            <Box>
                              <QCDetailPanel
                                dimensions={[
                                  { label: 'Technical distortion', dim: variant.qc_report.technical_distortion },
                                  { label: 'Cinematic layout', dim: variant.qc_report.cinematic_imperfections },
                                  { label: 'Avatar matching', dim: variant.qc_report.avatar_consistency },
                                  { label: 'Product identity', dim: variant.qc_report.product_consistency },
                                  { label: 'Temporal coherence', dim: variant.qc_report.temporal_coherence },
                                  { label: 'Body integrity', dim: variant.qc_report.hand_body_integrity },
                                  { label: 'Text rendering', dim: variant.qc_report.brand_text_accuracy },
                                ]
                                  .filter((d) => d.dim != null)
                                  .map((d) => ({ label: d.label, score: d.dim!.score, reasoning: d.dim!.reasoning }))}
                              />
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </>
                  );

                  return (
                    <Box key={variant.index} sx={{ flex: { xs: '0 0 85%', sm: '0 0 45%', md: '0 0 31.5%' }, scrollSnapAlign: 'center' }}>
                      <Card
                        sx={{
                          height: '100%',
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          borderRadius: '16px',
                          position: 'relative',
                          cursor: onSelectVariant && !readOnly ? 'pointer' : 'default',
                          background: 'background.paper',
                          backgroundImage: isSelected ? 'linear-gradient(rgba(100, 108, 255, 0.02), rgba(100, 108, 255, 0.02))' : 'none',
                          boxShadow: isSelected ? '0 0 25px rgba(100, 108, 255, 0.15)' : '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          '&:hover': onSelectVariant && !readOnly
                            ? {
                                borderColor: 'primary.main',
                                transform: 'translateY(-4px)',
                                boxShadow: isSelected ? '0 0 30px rgba(100, 108, 255, 0.25)' : '0 8px 24px rgba(0,0,0,0.2)',
                              }
                            : {},
                        }}
                      >
                        {onSelectVariant && !readOnly ? (
                          <CardActionArea
                            onClick={() => onSelectVariant(sceneResult.scene_number, variant.index)}
                            sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', borderRadius: '16px' }}
                          >
                            {cardContent}
                          </CardActionArea>
                        ) : (
                          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {cardContent}
                          </Box>
                        )}
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Expandable Developer Panels */}
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* QC Rewrite Context */}
              {sceneResult.qc_rewrite_context && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.005)' }}>
                  <Box
                    onClick={() => setExpandedQcContext((p) => ({ ...p, [sceneResult.scene_number]: !p[sceneResult.scene_number] }))}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', px: 3, py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main', letterSpacing: '0.01em', fontSize: 13, textTransform: 'uppercase' }}>
                      Loop Autoregen Compiler Logs
                    </Typography>
                    {expandedQcContext[sceneResult.scene_number] ? <ExpandLess sx={{ fontSize: 18, color: 'warning.main' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'warning.main' }} />}
                  </Box>
                  <Collapse in={!!expandedQcContext[sceneResult.scene_number]}>
                    <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontFamily: 'Consolas, monospace',
                          fontSize: 12,
                          color: 'text.secondary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 200,
                          overflow: 'auto',
                        }}
                      >
                        {sceneResult.qc_rewrite_context}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Prompt used */}
              {sceneResult.prompt_used && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.005)' }}>
                  <Box
                    onClick={() => setExpandedPrompts((p) => ({ ...p, [sceneResult.scene_number]: !p[sceneResult.scene_number] }))}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', px: 3, py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '0.01em', fontSize: 13, textTransform: 'uppercase' }}>
                      Compiled Generation Script Prompt
                    </Typography>
                    {expandedPrompts[sceneResult.scene_number] ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                  </Box>
                  <Collapse in={!!expandedPrompts[sceneResult.scene_number]}>
                    <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontFamily: 'Consolas, monospace',
                          fontSize: 12,
                          color: 'text.secondary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 180,
                          overflow: 'auto',
                        }}
                      >
                        {sceneResult.prompt_used}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Skeletons for pending clips */}
      {isLoading && totalScenes && results.length > 0 && results.length < totalScenes &&
        Array.from({ length: totalScenes - results.length }).map((_, n) => (
          <Box key={`pending-scene-${n}`} sx={{ mb: 4, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: '24px' }}>
            <Skeleton variant="text" width={180} height={40} sx={{ mb: 2, borderRadius: '4px' }} />
            <Grid container spacing={3}>
              {Array.from({ length: numVariants }).map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                  <Skeleton variant="rectangular" height={260} sx={{ borderRadius: '16px' }} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      }

      {/* Action Footer Navigation */}
      {results.length > 0 && (
        <Button
          variant="contained"
          fullWidth
          onClick={() => onContinue()}
          disabled={isLoading || readOnly}
          endIcon={<ArrowForward />}
          sx={{
            py: 2,
            mt: 4,
            borderRadius: '16px',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.02em',
            textTransform: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.45)',
            },
            '&:disabled': {
              background: 'action.disabledBackground',
            }
          }}
        >
          Proceed to Stitch Commercial
        </Button>
      )}
    </Box>
  );
}
