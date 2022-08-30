import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

/** Inject properties into class based component ('fake function component') */
export const withRouter = (Component) => {
  const Wrapper = (props) => {
    const navigate = useNavigate();
    const params = useParams();
    const searchParams = useSearchParams();
    
    return (
      <Component
        navigate={navigate}
        params={params}
        searchParams={searchParams}
        {...props}
        />
    );
  };
  
  return Wrapper;
};