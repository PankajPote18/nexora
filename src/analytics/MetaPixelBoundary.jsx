import { useMetaPixelTracker } from './useMetaPixelTracker';

const MetaPixelBoundary = () => {
    useMetaPixelTracker();
    return null;
};

export default MetaPixelBoundary;
