import asyncio
import logging
from pathlib import Path
from app.config import Settings

logger = logging.getLogger(__name__)


class VeoService:
    def __init__(self, client, settings: Settings):
        # Keep client for interface compatibility, but we don't need GCP/Vertex for local generation
        self.client = client
        self.settings = settings

    async def generate_videos(
        self,
        prompt: str,
        storyboard_path: str,
        output_dir: str,
        num_variants: int = 4,
        seed: int | None = None,
        resolution: str = "720p",
        negative_prompt_extra: str = "",
        aspect_ratio: str = "9:16",
        duration_seconds: int = 8,
        compression_quality: str = "optimized",
        veo_model: str | None = None,
        generate_audio: bool = True,
    ) -> list[str]:
        """Generate local MP4 video variants from a storyboard image using FFmpeg.

        Applies a high-quality Ken Burns panning/zooming effect to simulate motion,
        with 4 distinct motion styles for the variants (center zoom, pan left, pan right, slow zoom).
        """
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        # 24fps CFR
        fps = 24
        duration_frames = fps * duration_seconds

        # Aspect ratio dimensions
        if aspect_ratio == "16:9":
            w, h = 1280, 720
            scale_w, scale_h = 2560, 1440
        else:
            w, h = 720, 1280
            scale_w, scale_h = 1440, 2560

        # Define 4 cinematic motion variants
        variants_filters = [
            # Variant 0: Smooth zoom into center
            f"scale={scale_w}:{scale_h},zoompan=z='min(zoom+0.0015,1.35)':d={duration_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',scale={w}:{h}",
            # Variant 1: Zoom and slow pan left
            f"scale={scale_w}:{scale_h},zoompan=z='min(zoom+0.0015,1.35)':d={duration_frames}:x='(1-1/zoom)*iw*0.2':y='ih/2-(ih/zoom/2)',scale={w}:{h}",
            # Variant 2: Zoom and slow pan right
            f"scale={scale_w}:{scale_h},zoompan=z='min(zoom+0.0015,1.35)':d={duration_frames}:x='(1-1/zoom)*iw*0.8':y='ih/2-(ih/zoom/2)',scale={w}:{h}",
            # Variant 3: Extremely slow subtle zoom
            f"scale={scale_w}:{scale_h},zoompan=z='min(zoom+0.0008,1.2)':d={duration_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',scale={w}:{h}",
        ]

        generated_paths = []

        for i in range(num_variants):
            variant_filename = f"variant_{i}.mp4"
            variant_path = out_path / variant_filename
            filter_graph = variants_filters[i % len(variants_filters)]

            # Build FFmpeg command with silent audio if requested
            if generate_audio:
                cmd = [
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                    "-loop", "1", "-i", str(storyboard_path),
                    "-vf", filter_graph,
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    "-t", str(duration_seconds),
                    "-shortest",
                    "-pix_fmt", "yuv420p",
                    str(variant_path)
                ]
            else:
                cmd = [
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", str(storyboard_path),
                    "-vf", filter_graph,
                    "-c:v", "libx264",
                    "-t", str(duration_seconds),
                    "-pix_fmt", "yuv420p",
                    str(variant_path)
                ]

            logger.info("Generating local video variant %d using FFmpeg...", i)
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_log = stderr.decode()
                logger.error("FFmpeg video generation failed: %s", error_log)
                raise RuntimeError(f"FFmpeg failed with return code {process.returncode}: {error_log}")

            generated_paths.append(str(variant_path))
            logger.info("Saved local video variant %d to %s", i, variant_path)

        return generated_paths
