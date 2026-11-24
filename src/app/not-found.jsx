import NotFoundView from "./componants/notFound/NotFoundView";

export const metadata = {
    title: "Oops! We can't find this page · keralaplots.com",
    description: "The page you're looking for doesn't exist or may have been moved.",
};

export default function NotFound() {
    return <NotFoundView />;
}
