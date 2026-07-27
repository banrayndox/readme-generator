import { createJob, getJob } from '../services/jobManager.js';
import { startAnalysisJob } from '../workers/analysisWorker.js';
import { githubCloneSchema } from '../validators/jobValidator.js';

export const handleZipUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          details: 'Please attach a ZIP file to upload.'
        },
        message: 'No file uploaded'
      });
    }

    const zipFilePath = req.file.path;
    const job = createJob();
    const jobId = job.jobId;

    startAnalysisJob(jobId, 'zip', zipFilePath);

    res.status(202).json({
      success: true,
      data: { jobId },
      message: 'ZIP uploaded and analysis queued successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const handleGithubClone = async (req, res, next) => {
  try {
    const parseResult = githubCloneSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          details: parseResult.error.format()
        },
        message: 'Validation failed'
      });
    }

    const { url } = parseResult.data;
    const job = createJob();
    const jobId = job.jobId;

    startAnalysisJob(jobId, 'github', url);

    res.status(202).json({
      success: true,
      data: { jobId },
      message: 'GitHub clone job initialized.'
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          details: `Job with ID '${jobId}' was not found.`
        },
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        error: job.error
      },
      message: 'Job status retrieved successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetResult = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          details: `Job with ID '${jobId}' was not found.`
        },
        message: 'Job not found'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'RESULT_NOT_READY',
          details: `Analysis is currently in stage: '${job.status}'. Current progress: ${job.progress}%.`
        },
        message: 'Result is not ready'
      });
    }

    res.json({
      success: true,
      data: job.result,
      message: 'Analysis metrics fetched successfully.'
    });
  } catch (error) {
    next(error);
  }
};
