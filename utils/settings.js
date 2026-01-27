import Setting from '../models/setting.model.js';

/**
 * Fetches the company name from the settings or returns the default fallback.
 * @returns {Promise<string>} The company name.
 */
export const getCompanyName = async () => {
  try {
    const setting = await Setting.findOne({ key: 'companyName' });
    return setting ? setting.value : 'Gobokin';
  } catch (error) {
    return 'Gobokin';
  }
};
